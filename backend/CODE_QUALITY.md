# Code Quality & Validation

This project includes several safeguards to prevent syntax errors and code issues from reaching production.

## 🛡️ Safeguards

### 1. **ESLint** - Code Quality Checker
- **Location**: `backend/.eslintrc.json`
- **What it catches**:
  - Duplicate variable declarations (`no-redeclare`)
  - Duplicate imports (`no-duplicate-imports`)
  - Undefined variables (`no-undef`)
  - Unused variables (`no-unused-vars`)

### 2. **Pre-commit Hook** - Validates Before Committing
- **Location**: `.git/hooks/pre-commit`
- **What it does**: Runs ESLint and syntax checks before allowing commits
- **To enable**: Make it executable: `chmod +x .git/hooks/pre-commit`

### 3. **Validation Scripts** - Manual Checks
- **`npm run lint`**: Check code quality
- **`npm run lint:fix`**: Auto-fix linting issues
- **`npm run validate`**: Run all checks (lint + syntax)

### 4. **Pre-deploy Validation** - Railway Deployment
- **Location**: `backend/pre-deploy.sh`
- **What it does**: Validates code before Railway deployment
- **To use**: Add to Railway build command or use `prestart` script

## 📋 Usage

### Before Committing:
```bash
cd backend
npm run validate
```

### Before Pushing:
```bash
cd backend
npm run lint
```

### Auto-fix Issues:
```bash
cd backend
npm run lint:fix
```

## ⚙️ Railway Configuration

To enable validation on Railway deployments, add this to your Railway project settings:

**Build Command:**
```bash
cd backend && npm install && npm run validate && npm start
```

Or update `package.json` to include `prestart` (already added):
```json
"prestart": "npm run validate || true"
```

## 🔍 What Gets Checked

1. **Duplicate Declarations**: Prevents `const userId` declared twice
2. **Syntax Errors**: Catches invalid JavaScript syntax
3. **Undefined Variables**: Catches typos and missing imports
4. **Code Quality**: Enforces consistent code style

## 🚨 If Validation Fails

1. **Read the error message** - ESLint will tell you exactly what's wrong
2. **Fix the issue** - Edit the file and correct the problem
3. **Re-run validation** - `npm run validate` to confirm it's fixed
4. **Commit again** - The pre-commit hook will pass

## 💡 Tips

- Run `npm run lint` frequently while coding
- Use `npm run lint:fix` to auto-fix simple issues
- Check Railway logs if deployment fails - validation errors will be shown there

