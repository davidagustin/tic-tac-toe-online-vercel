# Visual Testing with Chromatic

This project uses Chromatic for visual regression testing to ensure the UI remains consistent across changes.

## 🎨 What is Chromatic?

Chromatic is a visual testing platform that:
- Captures screenshots of your components in different states
- Compares them against baseline images
- Detects visual regressions automatically
- Provides a visual diff interface for review

## 🚀 Quick Start

### 1. Set up Chromatic

1. Go to [Chromatic](https://www.chromatic.com/) and create an account
2. Create a new project for your repository
3. Get your project token from the project settings

### 2. Configure Environment

Set your Chromatic project token as an environment variable:

```bash
export CHROMATIC_PROJECT_TOKEN="your_project_token_here"
```

Or add it to your `.env` file:
```
CHROMATIC_PROJECT_TOKEN=your_project_token_here
```

### 3. Run Visual Tests

```bash
# Run visual tests locally
npm run test:visual

# Or run individual commands
npm run build-storybook
npm run chromatic:test
```

## 📋 Available Scripts

- `npm run storybook` - Start Storybook development server
- `npm run build-storybook` - Build Storybook for production
- `npm run test:visual` - Run complete visual testing pipeline
- `npm run chromatic:test` - Run Chromatic tests with local token
- `npm run chromatic:ci` - Run Chromatic tests with CI token

## 🧪 Test Stories

The following stories are available for visual testing:

### LoginForm Component
- **Default** - Basic login form state
- **WithFilledForm** - Form with pre-filled data
- **FocusedInput** - Input field in focus state
- **HoveredButton** - Button in hover state

### Test Parameters
- **Viewports**: 320px, 768px, 1024px, 1440px
- **Delay**: 1000ms (for animations to complete)
- **Layout**: Fullscreen

## 🔧 Configuration

### Chromatic Settings (`chromatic.json`)
```json
{
  "projectToken": "YOUR_CHROMATIC_PROJECT_TOKEN",
  "storybookBuildDir": "storybook-static",
  "exitZeroOnChanges": true,
  "autoAcceptChanges": false,
  "onlyChanged": false,
  "viewport": {
    "width": 1440,
    "height": 900
  },
  "delay": 1000,
  "diffThreshold": 0.1,
  "diffIncludeAntiAliasing": true
}
```

### Story Parameters
```typescript
parameters: {
  layout: 'fullscreen',
  chromatic: { 
    viewports: [320, 768, 1024, 1440],
    delay: 1000, // Wait for animations to complete
  },
}
```

## 🚀 CI/CD Integration

The project includes a GitHub Actions workflow (`.github/workflows/chromatic.yml`) that:

- Runs on push to `main` and `develop` branches
- Runs on pull requests to `main` branch
- Automatically builds Storybook
- Publishes to Chromatic for visual testing
- Provides visual diff reports in PR comments

## 📊 Understanding Results

### Chromatic Dashboard
- **Baseline**: Original approved screenshots
- **Changes**: New screenshots from current build
- **Diff**: Visual difference between baseline and changes
- **Review**: Approve or reject changes

### Common Statuses
- ✅ **No Changes** - Screenshots match baseline
- 🔍 **Review Required** - Visual differences detected
- ❌ **Build Failed** - Technical issues preventing capture

## 🛠️ Troubleshooting

### Common Issues

1. **PostCSS Configuration Error**
   ```bash
   # Fix: Update postcss.config.mjs to use object format
   const config = {
     plugins: {
       "@tailwindcss/postcss": {},
     },
   };
   ```

2. **Missing Dependencies**
   ```bash
   npm install --save-dev @storybook/testing-library
   ```

3. **Token Issues**
   ```bash
   # Verify token is set
   echo $CHROMATIC_PROJECT_TOKEN
   ```

### Debug Commands

```bash
# Check Storybook build
npm run build-storybook

# Run Chromatic with verbose output
npx chromatic --project-token=$CHROMATIC_PROJECT_TOKEN --debug

# Test specific story
npx chromatic --project-token=$CHROMATIC_PROJECT_TOKEN --only="Components/LoginForm"
```

## 📈 Best Practices

1. **Write Comprehensive Stories**
   - Cover all component states
   - Include interactive states (hover, focus, etc.)
   - Test different viewport sizes

2. **Use Meaningful Delays**
   - Wait for animations to complete
   - Account for loading states
   - Consider user interaction timing

3. **Review Changes Carefully**
   - Don't auto-accept all changes
   - Verify intentional UI updates
   - Document design decisions

4. **Maintain Baseline Quality**
   - Keep baseline images up to date
   - Remove obsolete stories
   - Archive old baselines

## 🔗 Resources

- [Chromatic Documentation](https://www.chromatic.com/docs/)
- [Storybook Visual Testing](https://storybook.js.org/docs/writing-tests/visual-testing)
- [Chromatic GitHub Action](https://github.com/chromaui/chromatic-action)
- [Visual Testing Best Practices](https://www.chromatic.com/docs/best-practices) 