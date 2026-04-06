import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlalchemy import update
from sqlmodel import func, select

from app.api.deps import SessionDep
from app.models import (
    FilteredFlow,
    Variant,
    VariantCreate,
    VariantPublic,
    VariantsPublic,
    VariantUpdate,
)

router = APIRouter(prefix="/variants", tags=["variants"])

@router.get("/", response_model=VariantsPublic, summary="Get variants for a flow")
def get_variants(
    root_flow_id: uuid.UUID,
    session: SessionDep,
    skip: int = 0,
    limit: int = 100
) -> Any:
    """
    获取属于特定原始流量的所有变体（扁平化结构）。
    """
    statement = (
        select(Variant)
        .where(Variant.root_flow_id == root_flow_id)
        .order_by(
            func.coalesce(Variant.last_replay_at, Variant.created_at).desc()
        )
        .offset(skip)
        .limit(limit)
    )
    results = session.exec(statement).all()
    count_statement = select(func.count()).select_from(Variant).where(Variant.root_flow_id == root_flow_id)
    count = session.exec(count_statement).one()

    return {"data": results, "count": count}

@router.post("/", response_model=VariantPublic, summary="Create a new variant manual")
def create_variant(
    variant_in: VariantCreate,
    session: SessionDep
) -> Any:
    """
    手动创建变体。
    """
    # 验证原始流量是否存在
    flow = session.get(FilteredFlow, variant_in.root_flow_id)
    if not flow:
        raise HTTPException(status_code=404, detail="Root flow not found")

    db_variant = Variant.model_validate(variant_in)
    session.add(db_variant)

    # [原子 SQL] 更新原始流量的变体计数
    # [Why]：SQL 表达式 `occurrence_count + 1` 由数据库层面执行，确保高并发采样的原子增量。
    # 相比于在 Python 层计算后写回，这能彻底避免“归零”风险。
    session.execute(
        update(FilteredFlow)
        .where(FilteredFlow.id == variant_in.root_flow_id)
        .values(occurrence_count=FilteredFlow.occurrence_count + 1)
    )

    session.commit()
    session.refresh(db_variant)
    return db_variant

@router.post("/push", response_model=VariantPublic, summary="API Push for external AI Agents")
def push_variant(
    variant_in: VariantCreate,
    session: SessionDep
) -> Any:
    """
    供外部 AI Agent 或大模型推送变体数据。
    逻辑与创建一致，但可扩展外部来源标记等。
    """
    return create_variant(variant_in=variant_in, session=session)

@router.patch("/{id}", response_model=VariantPublic, summary="Update variant details")
def update_variant(
    id: uuid.UUID,
    variant_in: VariantUpdate,
    session: SessionDep
) -> Any:
    """
    重命名或修改变体参数。
    """
    db_variant = session.get(Variant, id)
    if not db_variant:
        raise HTTPException(status_code=404, detail="Variant not found")

    update_data = variant_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_variant, key, value)

    session.add(db_variant)
    session.commit()
    session.refresh(db_variant)
    return db_variant

@router.delete("/{id}", summary="Delete a variant")
def delete_variant(id: uuid.UUID, session: SessionDep) -> Any:
    """
    物理删除变体。
    """
    db_variant = session.get(Variant, id)
    if not db_variant:
        raise HTTPException(status_code=404, detail="Variant not found")

    # [原子 SQL] 减少原始流量的变体计数，下限为 0 防止负数
    # [Why]：GREATEST(occurrence_count - 1, 0) 保证并发删除时计数不会变为负数。
    # 这是高并发数据一致性的标准防护模式。
    session.execute(
        update(FilteredFlow)
        .where(FilteredFlow.id == db_variant.root_flow_id)
        .values(occurrence_count=func.greatest(FilteredFlow.occurrence_count - 1, 0))
    )

    session.delete(db_variant)
    session.commit()
    return {"message": "Variant deleted successfully"}

@router.post("/{id}/replay", summary="Trigger replay for variant")
def replay_variant(id: uuid.UUID, session: SessionDep) -> Any:
    """
    触发变体重放执行。
    """
    from app.worker import celery_app
    db_variant = session.get(Variant, id)
    if not db_variant:
        raise HTTPException(status_code=404, detail="Variant not found")

    # 发送 Celery 延迟任务
    celery_app.send_task("replay_variant_task", args=[str(id)])

    return {"message": "Replay task queued", "variant_id": id}

@router.get("/history", summary="Get replay history for a flow")
def get_replay_history(
    root_flow_id: uuid.UUID,
    session: SessionDep,
    skip: int = 0,
    limit: int = 50
) -> Any:
    """
    获取流量及其变体的所有历史执行记录。
    """
    from app.models import ReplayResult
    
    # 🌟 物理总数统计：确保前端分页器知道有 1000+ 条记录
    count_statement = select(func.count()).select_from(ReplayResult).where(ReplayResult.root_flow_id == root_flow_id)
    count = session.exec(count_statement).one()

    statement = (
        select(ReplayResult)
        .where(ReplayResult.root_flow_id == root_flow_id)
        .order_by(ReplayResult.executed_at.desc())
        .offset(skip)
        .limit(limit)
    )
    results = session.exec(statement).all()
    return {"data": results, "count": count}
