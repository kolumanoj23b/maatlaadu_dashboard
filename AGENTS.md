<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Dashboard architecture
- Keep shared dashboard navigation, filters, and empty analytics views in reusable frontend components; each content section has its own TanStack route for direct navigation.
- Until the existing backend is connected, render unavailable values and disabled private-data actions rather than simulated authentication or seeded records.
- Read private data only through server functions that verify the administrator role before touching records, because row-level security alone lets a signed-in learner see their own rows only.
- Sort each table by the column that actually records its newest row (practice_history uses attempted_at, not created_at), since a wrong sort column fails the whole read.
- Keep the deployment target configurable through the `NITRO_PRESET` variable in `vite.config.ts` instead of hardcoding a Nitro preset, so one codebase builds for Lovable hosting and for any external host.
- Configure file-based routing through the existing TanStack Start plugin, with source-relative route paths and a project-local absolute temporary directory; atomic generation must not depend on the build process's working directory or an external TSR_TMP_DIR.
