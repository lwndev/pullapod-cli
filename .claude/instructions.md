# Project Development Rules

## General Rules

1. **Git Commit and Push Policy**: Prompt the user to commit and push changes. NEVER commit or push changes without explicit approval from the user. Always ask first before running any git commit or git push commands.

## Feature Development Process Rules

1. **Step-by-Step Execution**: Execute feature development step-by-step for each feature phase. Break down work into clear, manageable steps and complete them one at a time.

2. **User Approval Between Steps**: Pause after completing each step and ask for input from the user before moving to the next step. Wait for explicit approval to proceed.

## Documentation Rules

1. **Documentation is Stored in the docs/ Directory**: When creating documentation for features, troubleshooting, implementation plans, requirements, etc. Create and maintain documentation files in the `docs/` directory of the pullapod-cli project or in subdirectories of `docs/`.

2. **Documentation Subdirectories**: 
* Maintain requirements in the `docs/requirements` directory. 
* High-level feature and configuration documentation is maintained in `README.md` at the root of the `pullapod-cli` repository.
* Maintain feature detailed feature documentation in the `docs/features` directory. 
* Maintain implementation plans in the `docs/implementation` directory.
* Maintain test related documentation in the `docs/testing` directory.

## Testing Rules

1. **Maintain Separate Directories for Unit and Integration Tests**: 
* Unit tests are maintained in the `tests/unit` directory in this project.
* Integration tests are maintained in the `tests/integration` directory in this project.