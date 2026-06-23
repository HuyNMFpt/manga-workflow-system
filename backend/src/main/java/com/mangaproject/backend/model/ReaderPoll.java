package com.mangaproject.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "reader_polls")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReaderPoll {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "series_id", nullable = false)
    private String seriesId;

    @Column(name = "entered_by", nullable = false)
    private String enteredBy;

    @Column(name = "poll_period", nullable = false)
    private Integer pollPeriod;

    @Column(name = "poll_year", nullable = false)
    private Integer pollYear;

    @Column(name = "rank_position", nullable = false)
    private Integer rankPosition;

    @Column(name = "vote_count", nullable = false)
    private Integer voteCount = 0;

    @Column(name = "reader_score")
    private Integer readerScore;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "poll_date", nullable = false)
    private LocalDate pollDate;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
