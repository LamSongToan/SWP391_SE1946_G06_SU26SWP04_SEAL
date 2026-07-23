# 03_scoring_promotion_publish

Run order:
1. ../../seal_hackathon.sql
2. ../../seed_test_data.sql
3. one SQL file in this folder

- ./01_scoring_open_judge_ready.sql
  - Qualifier submission deadline is over, all submissions exist, and judges can begin scoring.
- ./02_ready_for_finalize_promote_publish.sql
  - Qualifier submissions are fully scored so the coordinator can finalize, calculate, promote, and publish.
- ./03_advance_to_final_after_promotion.sql
  - Standalone final-round setup with qualifier rankings finalized, promoted, and published; qualified teams can submit while eliminated teams are blocked.
