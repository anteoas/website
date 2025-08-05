# Testing

## Overview

The project uses Jest for testing, with separate unit and integration test suites.

## Test Structure

```
tests/
├── unit/                    # Unit tests for individual modules
│   ├── image-processor.test.js
│   ├── base-path.test.js
│   └── content-processing.test.js
├── integration/             # Integration tests for build process
│   └── build.test.js
└── fixtures/               # Test fixtures and mock data
```

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

## Test Categories

### Unit Tests

#### Image Processor
- URL extraction from HTML
- Query parameter parsing
- Path transformation
- Placeholder generation logic

#### Base Path Handling
- URL transformation with base path
- Root path handling
- External URL preservation

#### Content Processing
- Markdown parsing
- Frontmatter extraction
- Team member HTML generation
- Language prefix handling

### Integration Tests

#### Build Process
- Basic build without base path
- GitHub Pages build with base path
- Image processing in actual build
- JavaScript bundling (dev vs production)
- Multilingual content generation

## Continuous Integration

Tests run automatically on:
- Push to main branch
- Pull requests
- Multiple Node.js versions (18.x, 20.x, 22.x)

## Writing New Tests

### Unit Test Example
```javascript
describe('Module Name', () => {
  it('should do something specific', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = functionUnderTest(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

### Integration Test Example
```javascript
describe('Feature', () => {
  it('should work end-to-end', (done) => {
    // Run build
    execSync('npm run build');
    
    // Check output
    const content = fs.readFileSync('dist/index.html', 'utf8');
    expect(content).toContain('expected content');
    
    done();
  }, 30000); // Timeout for long-running tests
});
```

## Mocking

The test suite uses Jest mocks for:
- File system operations (fs-extra)
- External dependencies
- Build environment variables

## Coverage Goals

- Unit tests: 80%+ coverage
- Integration tests: Key user paths
- Focus on critical functionality:
  - Image processing
  - Base path handling
  - Content generation
