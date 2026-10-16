/**
 * Fronteiras de arquitectura (guia 4.1).
 * app → routes → features → entities → shared. Cada camada só importa das de baixo,
 * e as features nunca importam umas das outras.
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: 'shared-nao-importa-acima',
      severity: 'error',
      from: { path: '^src/shared/' },
      to: { path: '^src/(app|routes|features|entities)/' },
    },
    {
      name: 'entities-so-importam-shared',
      severity: 'error',
      from: { path: '^src/entities/' },
      to: { path: '^src/(app|routes|features)/' },
    },
    {
      name: 'entidades-nao-se-importam',
      comment: 'Uma entidade não importa outra; a composição faz-se nas features ou nas rotas.',
      severity: 'error',
      from: { path: '^src/entities/([^/]+)/' },
      to: { path: '^src/entities/', pathNot: '^src/entities/$1/' },
    },
    {
      name: 'features-so-importam-entities-e-shared',
      severity: 'error',
      from: { path: '^src/features/' },
      to: { path: '^src/(app|routes)/' },
    },
    {
      name: 'features-nao-se-importam',
      severity: 'error',
      from: { path: '^src/features/([^/]+)/' },
      to: { path: '^src/features/', pathNot: '^src/features/$1/' },
    },
    {
      name: 'routes-nao-importam-app',
      severity: 'error',
      from: { path: '^src/routes/' },
      to: { path: '^src/app/', pathNot: '^src/app/routeTree\\.gen\\.ts$' },
    },
    {
      name: 'mocks-so-no-arranque-e-testes',
      comment:
        'Os dados simulados nunca entram no código de produto (testes e histórias podem semeá-los).',
      severity: 'error',
      from: {
        path: '^src/(routes|features|entities|shared)/',
        pathNot: '\\.(test|stories)\\.tsx?$',
      },
      to: { path: '^src/mocks/' },
    },
    {
      name: 'sem-ciclos',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: 'routeTree\\.gen\\.ts$' },
    tsConfig: { fileName: 'tsconfig.app.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.ts', '.tsx', '.js', '.d.ts'],
    },
  },
}
