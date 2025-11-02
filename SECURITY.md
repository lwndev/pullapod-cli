# Security Policy

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of pullapod seriously. If you believe you have found a security vulnerability, please report it to us as described below.

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via one of the following methods:

1. **Email**: Send an email to [security@pullapod.app] with:
   - A description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact
   - Any suggested fixes (if applicable)

2. **GitHub Security Advisory**: Use GitHub's private vulnerability reporting feature at:
   https://github.com/lwndev/pullapod/security/advisories/new

### What to expect

- We will acknowledge receipt of your vulnerability report within 48 hours
- We will send a more detailed response within 5 business days indicating next steps
- We will keep you informed of the progress towards a fix
- We may ask for additional information or guidance

## Security Best Practices for Users

When using pullapod:

1. **Keep dependencies updated**: Regularly run `npm audit` and update dependencies
2. **Use trusted RSS feeds**: Only download from RSS feeds you trust
3. **Review downloaded content**: Be aware of what you're downloading
4. **File permissions**: Check that downloaded files have appropriate permissions
5. **Network security**: Be cautious when using pullapod on untrusted networks

## Dependency Security

We actively monitor our dependencies for security vulnerabilities using:

- npm audit
- GitHub Dependabot
- Regular dependency updates

You can check for vulnerabilities by running:

```bash
npm audit
```

## Security Updates

Security updates will be released as patch versions and documented in the CHANGELOG with a `[SECURITY]` tag.

## Disclosure Policy

When we receive a security bug report, we will:

1. Confirm the problem and determine affected versions
2. Audit code to find similar problems
3. Prepare fixes for all supported releases
4. Release new security patch versions

## Comments on this Policy

If you have suggestions on how this process could be improved, please submit a pull request or open an issue.
