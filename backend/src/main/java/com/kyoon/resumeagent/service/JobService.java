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

    public List<JobGroupSummaryDTO> getAllJobs() {
        return jobRepository.findAll().stream()
                .map(job -> new JobGroupSummaryDTO(
                        job.getId(),
                        job.getGroupCode(),
                        job.getGroupName(),
                        job.getCategory(),
                        job.getMeasureType()
                ))
                .collect(Collectors.toList());
    }

    public JobGroupDetailDTO getJobByCode(String groupCode) {
        Job job = jobRepository.findByGroupCode(groupCode)
                .orElseThrow(() -> new IllegalArgumentException("직무 그룹을 찾을 수 없습니다: " + groupCode));
        return toDetailDTO(job);
    }

    public JobGroupDetailDTO getJobById(Long id) {
        Job job = jobRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("직무 그룹을 찾을 수 없습니다: " + id));
        return toDetailDTO(job);
    }

    public List<JobGroupSummaryDTO> getJobsByCategory(String category) {
        return jobRepository.findByCategory(category).stream()
                .map(job -> new JobGroupSummaryDTO(
                        job.getId(),
                        job.getGroupCode(),
                        job.getGroupName(),
                        job.getCategory(),
                        job.getMeasureType()
                ))
                .collect(Collectors.toList());
    }

    public List<String> getAllCategories() {
        return jobRepository.findAllCategories();
    }

    private JobGroupDetailDTO toDetailDTO(Job job) {
        List<CapabilityCodeDTO> competencies = job.getCompetencies().stream()
                .map(c -> new CapabilityCodeDTO(
                        c.getId(),
                        c.getCapCode(),
                        c.getName(),
                        c.getWeight()
                ))
                .collect(Collectors.toList());

        return new JobGroupDetailDTO(
                job.getId(),
                job.getGroupCode(),
                job.getGroupName(),
                job.getCategory(),
                job.getDescription(),
                job.getMeasureType(),
                competencies
        );
    }
}