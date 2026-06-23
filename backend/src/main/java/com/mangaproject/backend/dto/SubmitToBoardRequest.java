package com.mangaproject.backend.dto;

import lombok.Data;

@Data
public class SubmitToBoardRequest {
    private String audienceSummary;
    private String marketingAngle;
    private String whyItWillSell;
    private String recommendedSchedule; // weekly | biweekly | monthly
    private String editorNote;
}
