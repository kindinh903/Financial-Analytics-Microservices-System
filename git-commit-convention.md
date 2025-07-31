## Git Architecture and Git Flow

- Link: [A successful Git branching model](https://nvie.com/posts/a-successful-git-branching-model/)

### Key Branches:

- **Main**: The complete, production-ready product after each phase (no direct coding happens on the `main` branch).
- **Hotfixes (optional)**: Used for fixing bugs found in the `main` branch.
- **Release branches**: Created from `develop` to review and fix bugs before merging into `main`.
- **Develop**: This branch is where active development of new features occurs.
- **Feature branches**: Created for individual features or tasks.

### Git Flow: After each phase, typically only two branches remain: `main` (the product) and `develop` (development work).

### Workflow

1. **Product Leader** creates the repository for the product and initializes the `develop` branch.
2. **Team Leader** creates assignments in the "Issues" section of the repository and assigns them to team members. Each task will be tagged with a unique ID (e.g., `#`).
3. **Team Members** follow these steps:
   1. Create a feature branch for their assigned task:  
      `git checkout -b feature/<#issue-number>-<tag-name>`  
      and start coding.
   2. When committing changes, reference the corresponding issue:  
      `git commit -m '#<issue-number>-<member-name>-<feature-name>'`
      This ensures the commit is linked to the task in "Issues."
   3. Push the feature branch to the repository:  
      `git push --set-upstream origin feature/<#issue-number>-<tag-name>`
   4. Create a pull request for code review → after approval, the branch is merged into `develop`.
4. **Team Leader** reviews the code, and once the feature is complete, comments on the issue to close it.
5. **Product Leader** confirms and merges the `develop` on GitHub.
   Pull the changes locally:  
    `git pull develop`
   Afterward, the feature branch is deleted:  
   `git branch -d feature/<#issue-number>-<tag-name>`  
   and on GitHub:  
   `git push origin -d feature/<#issue-number>-<tag-name>`.
6. **Product Leader** creates a release branch:  
   `git checkout -b release-1.0.0 develop`  
   Tags the release:  
   `git tag v1.0.0`  
   and pushes the tags:  
   `git push --tags`.  
   Merges the release branch from `develop`:  
   `git merge develop`  
   Pushes the release branch to the repository:  
   `git push origin release-1.0.0`.
   1. The team reviews the code, debugs if necessary → pushes changes and creates pull requests → once reviewed, the branch is merged into `main` → pulls changes locally:  
      `git pull main`.
   2. **Product Leader** creates a tag for the `main` branch:  
      `git tag v1.0.0-main`  
      and pushes the tags:  
      `git push --tags`.  
      The release branch is then deleted locally:  
      `git branch -d release-1.0.0`  
      and from GitHub:  
      `git push origin -d release-1.0.0`.
7. If the `main` branch has any bugs, a **hotfix** branch is created. The issue is fixed and merged into `main`, and then the hotfix branch is deleted.
8. The cycle continues with new assignments.
