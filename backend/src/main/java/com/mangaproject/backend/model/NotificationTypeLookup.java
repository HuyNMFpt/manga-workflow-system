package com.mangaproject.backend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "notification_types")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationTypeLookup {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(unique = true, nullable = false, length = 100)
    private String name;

    @Column(length = 255)
    private String description;
}
