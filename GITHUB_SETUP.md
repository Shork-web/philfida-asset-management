# Setting up GitHub for this project

Follow these steps to put your project on GitHub.

---

## 1. Install Git (if needed)

If you don’t have Git yet:

- **Windows:** Download and run [Git for Windows](https://git-scm.com/download/win). Use the default options and ensure **“Git from the command line and also from 3rd-party software”** is selected so `git` works in PowerShell/CMD.
- After installing, **close and reopen** your terminal.

Check that it works:

```powershell
git --version
```

---

## 2. Create a new repository on GitHub

1. Go to [github.com](https://github.com) and sign in.
2. Click the **+** (top right) → **New repository**.
3. Set:
   - **Repository name:** e.g. `asset-system` or `philfida7-asset-management`
   - **Description:** (optional) e.g. `PhilFIDA 7 Asset Management System`
   - **Public** or **Private** as you prefer.
4. **Do not** check “Add a README”, “Add .gitignore”, or “Choose a license” (you already have these in the project).
5. Click **Create repository**.

---

## 3. Initialize Git and push from your computer

In a terminal, go to your project folder and run these commands **one at a time**:

```powershell
cd c:\Users\merto\asset-system
```

```powershell
git init
```

```powershell
git add .
```

```powershell
git status
```

Check that `.env` does **not** appear in the list (it must be ignored). If you see it, your `.gitignore` is wrong; fix it before committing.

```powershell
git commit -m "Initial commit: PhilFIDA 7 Asset Management"
```

Add GitHub as the remote (replace `YOUR_USERNAME` and `YOUR_REPO` with your GitHub username and repo name):

```powershell
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
```

Example: if your username is `juan-dela-cruz` and the repo is `asset-system`:

```powershell
git remote add origin https://github.com/juan-dela-cruz/asset-system.git
```

Push the code (first time):

```powershell
git branch -M main
git push -u origin main
```

If GitHub asks you to sign in, use your GitHub account (or a [Personal Access Token](https://github.com/settings/tokens) if you use 2FA).

---

## 4. Done

Your project is now on GitHub. For future changes:

```powershell
git add .
git commit -m "Describe what you changed"
git push
```

---

## Important: keep secrets safe

- **Do not** commit `.env` (it’s in `.gitignore`). It holds your Firebase config and sign-up master key.
- Use `.env.example` as a template for others; leave real values out of the repo.
- If you ever committed `.env` by mistake, rotate your Firebase keys and master key and remove the file from history (e.g. with `git filter-branch` or BFG Repo-Cleaner).
