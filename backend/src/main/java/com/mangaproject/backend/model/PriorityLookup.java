package com.mangaproject.backend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "priorities")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PriorityLookup {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(unique = true, nullable = false, length = 50)
    private String name;

    @Column(nullable = false)
    private Integer level = 0;

    @Column(length = 255)
    private String description;
}
