package com.mangaproject.backend.service;

import com.mangaproject.backend.model.EditorialProposal;
import com.mangaproject.backend.model.EditorialVote;
import com.mangaproject.backend.model.User;
import com.mangaproject.backend.repository.EditorialProposalRepository;
import com.mangaproject.backend.repository.EditorialVoteRepository;
import com.mangaproject.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class EditorialProposalDeadlineScheduler {

    private final EditorialProposalRepository editorialProposalRepository;
    private final EditorialVoteRepository editorialVoteRepository;
    private final UserRepository userRepository;
    private final BoardService boardService;

    /**
     * BD-11 / BD-12: Chạy mỗi phút — kiểm tra proposal đã hết hạn voting
     * Ai chưa vote → tạo EditorialVote thật với vote=abstain (auto-abstain)
     * Sau đó quyết định: quorum không đủ → expired; yes > no → approved; else → rejected
     */
    @Scheduled(cron = "0 * * * * *")
    @Transactional
    public void processExpiredProposals() {
        LocalDateTime now = LocalDateTime.now();

        List<EditorialProposal> expired = editorialProposalRepository
                .findByStatusAndVotingDeadlineBefore(EditorialProposal.ProposalStatus.voting, now);

        if (expired.isEmpty()) return;

        for (EditorialProposal proposal : expired) {
            // Auto-abstain: tạo EditorialVote THẬT cho từng member chưa vote
            Set<String> votedIds = editorialVoteRepository
                    .findByProposalIdOrderByVotedAtAsc(proposal.getId())
                    .stream()
                    .map(EditorialVote::getVoterId)
                    .collect(Collectors.toSet());

            List<User> allBoardMembers = userRepository.findByRole_NameAndIsActiveTrue("board_member");
            List<User> notVoted = allBoardMembers.stream()
                    .filter(u -> !votedIds.contains(u.getId()))
                    .collect(Collectors.toList());

            for (User member : notVoted) {
                EditorialVote autoVote = new EditorialVote();
                autoVote.setProposalId(proposal.getId());
                autoVote.setVoterId(member.getId());
                autoVote.setVote(EditorialVote.VoteChoice.abstain);
                autoVote.setComment("Tự động — không bỏ phiếu trước hạn");
                editorialVoteRepository.save(autoVote);
            }

            if (!notVoted.isEmpty()) {
                proposal.setVoteAbstain(proposal.getVoteAbstain() + notVoted.size());
                log.info("ProposalDeadlineScheduler: auto-abstain {} members for proposalId={}",
                        notVoted.size(), proposal.getId());
            }

            // Quyết định: check quorum trước, rồi mới yes/no
            int activeBoardMembers = allBoardMembers.size();
            int quorum = Math.max(2, (int) Math.ceil(activeBoardMembers * 0.6));
            int totalVotes = proposal.getVoteYes() + proposal.getVoteNo() + proposal.getVoteAbstain();

            int yes = proposal.getVoteYes();
            int no  = proposal.getVoteNo();

            if (totalVotes < quorum) {
                proposal.setStatus(EditorialProposal.ProposalStatus.expired);
                proposal.setDecidedAt(now);
                editorialProposalRepository.save(proposal);
                log.info("ProposalDeadlineScheduler: EXPIRED proposalId={} (totalVotes={} < quorum={})",
                        proposal.getId(), totalVotes, quorum);
            } else if (yes > no) {
                proposal.setStatus(EditorialProposal.ProposalStatus.approved);
                proposal.setDecidedAt(now);
                editorialProposalRepository.save(proposal);
                boardService.applyDecisionToSeries(proposal);
                log.info("ProposalDeadlineScheduler: APPROVED proposalId={} (yes={} no={} abstain={})",
                        proposal.getId(), yes, no, proposal.getVoteAbstain());
            } else {
                proposal.setStatus(EditorialProposal.ProposalStatus.rejected);
                proposal.setDecidedAt(now);
                editorialProposalRepository.save(proposal);
                log.info("ProposalDeadlineScheduler: REJECTED proposalId={} (yes={} no={} abstain={})",
                        proposal.getId(), yes, no, proposal.getVoteAbstain());
            }
        }
    }
}