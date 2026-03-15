from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class VideoRequest(BaseModel):
    link: str = Field(
        ...,
        description="抖音分享链接或包含链接的整段分享文案",
        examples=[
            "https://v.douyin.com/e3x2fjE/",
            "打开抖音看视频 https://v.douyin.com/e3x2fjE/ 复制此链接",
        ],
    )


class Statistics(BaseModel):
    collect_count: int | None = Field(
        default=None, description="收藏数", examples=[4109]
    )
    comment_count: int | None = Field(
        default=None, description="评论数", examples=[925]
    )
    digg_count: int | None = Field(default=None, description="点赞数", examples=[31667])
    download_count: int | None = Field(
        default=None, description="下载数（可能为 null 或缺失）", examples=[None]
    )
    share_count: int | None = Field(default=None, description="分享数", examples=[5437])


class AwemeDetail(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    aweme_id: str | None = Field(
        default=None, description="作品 ID", examples=["7606984523657579819"]
    )
    desc: str | None = Field(
        default=None,
        validation_alias="desc",
        description="作品文案/标题（抖音通常用 desc 字段承载）",
        examples=[
            "勇闯非洲野生动物黑市，一路被敲诈勒索，这里什么都吃实在恐怖 #交换世界计划"
        ],
    )
    create_time: int | None = Field(
        default=None,
        description="发布时间（Unix 时间戳，秒）",
        examples=[1707962100],
    )
    statistics: Statistics | None = Field(default=None, description="统计信息")
    duration: int | None = Field(
        default=None, description="时长（单位以第三方返回为准）", examples=[1074560]
    )
    music: dict[str, Any] | None = Field(
        default=None, description="音乐信息（原始结构）"
    )
    author: dict[str, Any] | None = Field(
        default=None, description="作者信息（原始结构）"
    )
    video: dict[str, Any] | None = Field(
        default=None, description="视频信息（原始结构）"
    )

    @field_validator("desc", mode="before")
    @classmethod
    def validate_desc(cls, v: Any) -> str | None:
        return str(v) if v is not None else None


class TikhubRawResponse(BaseModel):
    code: int | None = Field(
        default=None,
        description="第三方业务状态码（通常 200 表示成功）",
        examples=[200],
    )
    msg: str | None = Field(
        default=None, description="第三方业务消息", examples=["success"]
    )
    data: dict[str, Any] | None = Field(
        default=None, description="第三方 data 原始结构"
    )

    @property
    def aweme_detail(self) -> AwemeDetail | None:
        if not self.data:
            return None

        detail_data = self.data.get("aweme_detail")
        if detail_data:
            return AwemeDetail(**detail_data)
        return None


class VideoData(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "audio_url": "https://sf5-hl-ali-cdn-tos.douyinstatic.com/obj/ies-music/7606956349372615475.mp3",
                    "aweme_id": "7606984523657579819",
                    "cover_url": "https://p3-sign.douyinpic.com/obj/c8510002be9a3a61aad2?lk3s=138a59ce&x-expires=1774706400&x-signature=9uhjhXrSMU9Z4Gz%2BtmsmMr9VG%2B4%3D&from=327834062",
                    "create_time": "2026-02-15 09:55:00",
                    "desc": "勇闯非洲野生动物黑市，一路被敲诈勒索，这里什么都吃实在恐怖 #交换世界计划 #春节旅行好去处 #尼日利亚 #新年旅行第一站",
                    "duration": 1074560,
                    "statistics": {
                        "collect_count": 4109,
                        "comment_count": 925,
                        "digg_count": 31667,
                        "download_count": None,
                        "share_count": 5437,
                    },
                    "title": "勇闯非洲野生动物黑市，一路被敲诈勒索，这里什么都吃实在恐怖 #交换世界计划 #春节旅行好去处 #尼日利亚 #新年旅行第一站",
                    "video_url": "https://v5-dy-o-abtest.zjcdn.com/02999f81e98ce2f438d4303bc418c395/69b57d03/video/tos/cn/tos-cn-ve-15/oo4CKGm5Ud2CIffDLcAuQIEGRAFMRYfEEQenhq/?a=1128&ch=26&cr=13&dr=0&lr=all&cd=0%7C0%7C0%7C&cv=1&br=2381&bt=2381&cs=0&ds=6&ft=r0yIZ26Td95~~iSYsiI9B4yoFIKrHgSFS4fyRBHCnzyN9QZgxRyqkZ&mime_type=video_mp4&qs=0&rc=Zzs6ZjQ3OTczMzlnZWY8NUBpMzVveXQ5cnVxOTMzNGkzM0AuNV5hLmM1NTYxXzQyLTFiYSMvcjFrMmRzLTVhLS1kLTBzcw%3D%3D&btag=c0010e000b8009&cdn_type=1&cquery=103Y_100b_104i_103Q_103W&dy_q=1773497025&feature_id=f0150a16a324336cda5d6dd0b69ed299&l=20260314220345592C096DA77FAFB95A71&pdp=online_xy&pwid=1&req_cdn_type=r",
                }
            ]
        }
    )

    audio_url: str | None = Field(
        default=None, description="音频（BGM）直链", examples=["https://...mp3"]
    )
    aweme_id: str | None = Field(
        default=None, description="作品 ID", examples=["7606984523657579819"]
    )
    cover_url: str | None = Field(
        default=None, description="封面图直链", examples=["https://...jpg"]
    )
    create_time: str | None = Field(
        default=None,
        description="发布时间（格式化后的字符串）",
        examples=["2026-02-15 09:55:00"],
    )
    desc: str | None = Field(
        default=None, description="作品文案/描述", examples=["..."]
    )
    duration: int | None = Field(
        default=None, description="时长（单位以第三方返回为准）", examples=[1074560]
    )
    statistics: Statistics | None = Field(default=None, description="统计信息")
    title: str | None = Field(
        default=None, description="标题（通常与 desc 一致）", examples=["..."]
    )
    video_url: str | None = Field(
        default=None, description="视频播放直链", examples=["https://...mp4"]
    )


class VideoResponse(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "message": "解析成功",
                    "data": {
                        "audio_url": "https://sf5-hl-ali-cdn-tos.douyinstatic.com/obj/ies-music/7606956349372615475.mp3",
                        "aweme_id": "7606984523657579819",
                        "cover_url": "https://p3-sign.douyinpic.com/obj/c8510002be9a3a61aad2?lk3s=138a59ce&x-expires=1774706400&x-signature=9uhjhXrSMU9Z4Gz%2BtmsmMr9VG%2B4%3D&from=327834062",
                        "create_time": "2026-02-15 09:55:00",
                        "desc": "勇闯非洲野生动物黑市，一路被敲诈勒索，这里什么都吃实在恐怖 #交换世界计划 #春节旅行好去处 #尼日利亚 #新年旅行第一站",
                        "duration": 1074560,
                        "statistics": {
                            "collect_count": 4109,
                            "comment_count": 925,
                            "digg_count": 31667,
                            "download_count": None,
                            "share_count": 5437,
                        },
                        "title": "勇闯非洲野生动物黑市，一路被敲诈勒索，这里什么都吃实在恐怖 #交换世界计划 #春节旅行好去处 #尼日利亚 #新年旅行第一站",
                        "video_url": "https://v5-dy-o-abtest.zjcdn.com/02999f81e98ce2f438d4303bc418c395/69b57d03/video/tos/cn/tos-cn-ve-15/oo4CKGm5Ud2CIffDLcAuQIEGRAFMRYfEEQenhq/?a=1128&ch=26&cr=13&dr=0&lr=all&cd=0%7C0%7C0%7C&cv=1&br=2381&bt=2381&cs=0&ds=6&ft=r0yIZ26Td95~~iSYsiI9B4yoFIKrHgSFS4fyRBHCnzyN9QZgxRyqkZ&mime_type=video_mp4&qs=0&rc=Zzs6ZjQ3OTczMzlnZWY8NUBpMzVveXQ5cnVxOTMzNGkzM0AuNV5hLmM1NTYxXzQyLTFiYSMvcjFrMmRzLTVhLS1kLTBzcw%3D%3D&btag=c0010e000b8009&cdn_type=1&cquery=103Y_100b_104i_103Q_103W&dy_q=1773497025&feature_id=f0150a16a324336cda5d6dd0b69ed299&l=20260314220345592C096DA77FAFB95A71&pdp=online_xy&pwid=1&req_cdn_type=r",
                    },
                }
            ]
        }
    )

    message: str | None = Field(
        default=None, description="提示信息", examples=["解析成功"]
    )
    data: VideoData | None = Field(default=None, description="解析出的作品数据")
