package com.kyoon.resumeagent.Entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.util.Map;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "job_postings")
public class JobPosting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String companyName;

    private String position;

    @Column(length = 2000)
    private String mainTasks;

    @Column(length = 2000)
    private String requirements;

    @Column(length = 2000)
    private String preferred;

    private String techStack;

    private String workPlace;

    private String employmentType;

    @Column(length = 2000)
    private String vision;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "json")
    private Map<String, Double> capabilityVector;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}