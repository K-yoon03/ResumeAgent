package com.kyoon.resumeagent.service;

import com.kyoon.resumeagent.DTO.JobDTOs.*;
import com.kyoon.resumeagent.Entity.Job;
import com.kyoon.resumeagent.repository.JobRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class JobService {

    private final JobRepository jobRepository;

    public JobService(JobRepository jobRepository) {
        this.jobRepository = jobRepository;
    }

    // 전체 직무 목록
    public List<JobSummaryDTO> getAllJobs() {
        return jobRepository.findAll().stream()
                .map(job -> new JobSummaryDTO(
                        job.getId(),
                        job.getJobCode(),
                        job.getJobName(),
                        job.getCategory(),
                        job.getNcsLarge(),
                        job.getNcsMedium()
                ))
                .collect(Collectors.toList());
    }

    // 직무 코드로 상세 조회
    public JobDetailDTO getJobByCode(String jobCode) {
        Job job = jobRepository.findByJobCode(jobCode)
                .orElseThrow(() -> new IllegalArgumentException("직무를 찾을 수 없습니다: " + jobCode));

        return toDetailDTO(job);
    }

    // ID로 상세 조회
    public JobDetailDTO getJobById(Long id) {
        Job job = jobRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("직무를 찾을 수 없습니다: " + id));

        return toDetailDTO(job);
    }

    // 카테고리별 직무 목록
    public List<JobSummaryDTO> getJobsByCategory(String category) {
        return jobRepository.findByCategory(category).stream()
                .map(job -> new JobSummaryDTO(
                        job.getId(),
                        job.getJobCode(),
                        job.getJobName(),
                        job.getCategory(),
                        job.getNcsLarge(),
                        job.getNcsMedium()
                ))
                .collect(Collectors.toList());
    }

    // 카테고리 목록
    public List<String> getAllCategories() {
        return jobRepository.findAllCategories();
    }

    // Job → JobDetailDTO 변환
    private JobDetailDTO toDetailDTO(Job job) {
        List<CompetencyDTO> competencies = job.getCompetencies().stream()
                .map(c -> new CompetencyDTO(
                        c.getId(),
                        c.getCompId(),
                        c.getName(),
                        c.getWeight(),
                        c.getIndicator(),
                        c.getMeasurement()
                ))
                .collect(Collectors.toList());

        return new JobDetailDTO(
                job.getId(),
                job.getJobCode(),
                job.getNcsLarge(),
                job.getNcsMedium(),
                job.getJobName(),
                job.getCategory(),
                job.getDescription(),
                job.getMeasurementMethod(),
                job.getSource(),
                competencies
        );
    }
}