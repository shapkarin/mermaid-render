// Custom Cypress commands for Mermaid processor testing

Cypress.Commands.add('createTestMarkdown', (path: string, content: string) => {
  cy.task('createTestFile', { path, content });
});

Cypress.Commands.add('runMermaidProcessor', (config: any) => {
  return cy.task('runProcessor', config);
});

Cypress.Commands.add('verifySvgGenerated', (paths: string[]) => {
  paths.forEach(path => {
    cy.task('fileExists', path).should('be.true');
  });
});

Cypress.Commands.add('verifyMarkdownUpdated', (path: string, expectedContent: string) => {
  cy.task('readFile', path).then((content) => {
    expect(content).to.include(expectedContent);
  });
});

Cypress.Commands.add('cleanupTestFiles', (pattern: string) => {
  cy.task('cleanupTestFiles', pattern);
});

Cypress.Commands.add('waitForFile', (path: string, timeout = 5000) => {
  const startTime = Date.now();
  
  const checkFile = () => {
    return cy.task('fileExists', path).then((exists) => {
      if (exists) {
        return cy.wrap(true);
      } else if (Date.now() - startTime < timeout) {
        cy.wait(100);
        return checkFile();
      } else {
        throw new Error(`File ${path} did not exist within ${timeout}ms`);
      }
    });
  };
  
  return checkFile();
});