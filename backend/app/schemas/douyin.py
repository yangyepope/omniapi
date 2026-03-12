from typing import Any
from pydantic import BaseModel, Field, field_validator, ConfigDict

class VideoRequest(BaseModel):
    link: str = Field(..., description="Douyin share link")

class Statistics(BaseModel):
    collect_count: int | None = Field(default=None, description="Number of collects")
    comment_count: int | None = Field(default=None, description="Number of comments")
    digg_count: int | None = Field(default=None, description="Number of likes")
    download_count: int | None = Field(default=None, description="Number of downloads")
    share_count: int | None = Field(default=None, description="Number of shares")

class AwemeDetail(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    aweme_id: str | None = None
    desc: str | None = Field(default=None, validation_alias="desc")
    create_time: int | None = None
    statistics: Statistics | None = None
    duration: int | None = None
    music: dict[str, Any] | None = None
    author: dict[str, Any] | None = None
    video: dict[str, Any] | None = None

    @field_validator("desc", mode="before")
    @classmethod
    def validate_desc(cls, v: Any) -> str | None:
        return str(v) if v is not None else None

class TikhubRawResponse(BaseModel):
    code: int | None = None
    msg: str | None = None
    data: dict[str, Any] | None = None

    @property
    def aweme_detail(self) -> AwemeDetail | None:
        if not self.data:
            return None
        
        detail_data = self.data.get("aweme_detail")
        if detail_data:
            return AwemeDetail(**detail_data)
        return None

class VideoData(BaseModel):
    audio_url: str | None = None
    aweme_id: str | None = None
    cover_url: str | None = None
    create_time: str | None = None
    desc: str | None = None
    duration: int | None = None
    statistics: Statistics | None = None
    title: str | None = None
    video_url: str | None = None

class VideoResponse(BaseModel):
    message: str | None = None
    data: VideoData | None = None
