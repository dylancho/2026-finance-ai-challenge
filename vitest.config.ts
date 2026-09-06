import { configDefaults, defineConfig } from "vitest/config";

/**
 * 2026-09-06: 병렬 작업용 git 워크트리가 .claude/worktrees/ 아래에 생기면서, 루트에서
 * vitest 를 돌리면 워크트리 안의 테스트까지 함께 잡혔다(15개 파일이 60개로 보였다).
 * 워크트리는 각자 자기 안에서 테스트를 돌리므로 루트에서는 제외한다.
 */
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, ".claude/**", ".worktrees/**", "worktrees/**"],
  },
});
