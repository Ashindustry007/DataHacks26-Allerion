from pydantic import BaseModel
from typing import Optional


class SpeciesForecast(BaseModel):
    species_id: int
    name: str
    pollen_type: str               # "tree" | "grass" | "weed"
    current_stage: str             # DORMANT | BUDDING | EARLY_BLOOM | PEAK_BLOOM | LATE_BLOOM | POST_BLOOM
    pollen_prob: float             # 0.0 - 1.0
    pollen_index: float            # 0.0 - 5.0
    days_to_peak: int
    peak_date_est: Optional[str]
    confidence: float              # 0.0 - 1.0
    sources: list[str]             # ["inat", "google", "base"]
    seasonal_shift_days: int
    inat_obs_count: int
    google_upi: Optional[int]


class DailyForecast(BaseModel):
    date: str
    day_offset: int                # 0 = today, 13 = day 14
    confidence_tier: str           # "high" (days 0-4) | "estimated" (5-13)
    composite_index: float         # 0.0 - 5.0
    severity: str                  # "low" | "moderate" | "high" | "very_high"
    top_species: list[SpeciesForecast]


class ForecastResponse(BaseModel):
    location: dict                 # { lat, lng, h3_cell, city }
    generated_at: str
    daily: list[DailyForecast]     # 14 items
    narrative: dict                # { headline, today_summary, seven_day, fourteen_day }
    advisory: dict                 # { general_measures, species_tips, timing_advice }


class PhotoClassifyResponse(BaseModel):
    species_id: Optional[int]
    species_name: str
    is_allergen: bool
    phenology_stage: str
    pollen_releasing: bool
    confidence: float
    explanation: str               # LLM-generated species explainer
    action: str                    # "what to do right now"
    local_forecast: Optional[ForecastResponse]


class HeatmapCell(BaseModel):
    h3_cell: str
    lat: float
    lng: float
    composite_index: float
    severity: str
    top_species_name: str
    top_species_prob: float


class UserProfileCreate(BaseModel):
    user_id: str
    trigger_species: list[int]    # taxon_ids the user is allergic to
    severity_threshold: str       # "low" | "moderate" | "high" | "very_high"
    lat: float
    lng: float
    fcm_token: str                # FCM device token; empty string disables push


class UserProfile(BaseModel):
    user_id: str
    trigger_species: list[int]
    severity_threshold: str
    lat: float
    lng: float
    fcm_token: str
    created_at: str
    updated_at: str


class AlertResult(BaseModel):
    user_id: str
    species_name: str
    severity: str
    notification_sent: bool


class AlertCheckResponse(BaseModel):
    alerts_evaluated: int
    alerts_sent: int
    details: list[AlertResult]
