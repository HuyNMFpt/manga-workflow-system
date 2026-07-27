package com.mangaproject.backend.dto;

import lombok.*;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProposalVoteDetailsDTO {
    private List<EditorialVoteDetailDTO> voted;   // đã bỏ phiếu
    private List<EditorialVoteDetailDTO> pending; // chưa bỏ phiếu
    private int quorum;                           // ngưỡng quorum động
    private int totalVotes;                       // số phiếu đã bỏ
}