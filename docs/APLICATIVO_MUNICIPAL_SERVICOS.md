# Aplicativo Municipal de Serviços

## 1. Visão geral e objetivos

O **Aplicativo Municipal de Serviços** é uma plataforma digital de atendimento ao cidadão para abertura, acompanhamento e resolução de demandas urbanas. O objetivo é reduzir filas presenciais, aumentar transparência e melhorar o tempo de resposta da Prefeitura com base em dados operacionais em tempo real.

### Objetivos estratégicos
- Centralizar solicitações municipais em um único canal mobile.
- Garantir rastreabilidade ponta a ponta por protocolo.
- Melhorar comunicação entre cidadão e Prefeitura por notificações e histórico.
- Produzir dados para planejamento de manutenção urbana e priorização orçamentária.

### Público-alvo
- Cidadãos (moradores).
- Servidores municipais (atendimento, fiscalização, obras, limpeza, iluminação e administração).
- Gestores públicos (monitoramento de indicadores e SLA).

---

## 2. Escopo funcional obrigatório

### 2.1 Solicitação de troca de lâmpadas de iluminação pública
**Descrição funcional**
- Cidadão informa local (GPS automático + endereço manual opcional), ponto de referência, descrição e foto opcional.
- Pode indicar tipo de falha (apagada, piscando, acesa durante o dia, poste danificado).

**Regras de negócio**
- Categoria padrão: `ILUMINACAO_PUBLICA`.
- Prioridade automática sugerida:
  - Alta: poste danificado/risco elétrico.
  - Média: rua totalmente sem iluminação.
  - Baixa: lâmpada isolada.
- Encaminhamento automático para equipe de iluminação.

**Resultado esperado**
- Geração imediata de protocolo único e rastreável.

### 2.2 Denúncia de buracos em vias públicas (foto + geolocalização)
**Descrição funcional**
- Cidadão registra ocorrência com foto obrigatória (mínimo 1), geolocalização e descrição.
- Possibilidade de marcar se há risco de acidente.

**Regras de negócio**
- Categoria: `BURACO_EM_VIA`.
- Geolocalização obrigatória, com fallback para pin no mapa.
- Sistema detecta duplicidade aproximada por raio (ex.: 30 metros) para sugerir vínculo em protocolo existente.

**Resultado esperado**
- Melhor triagem e redução de chamados duplicados.

### 2.3 Pedidos de limpeza urbana
**Descrição funcional**
- Solicitação para entulho, poda, descarte irregular, limpeza de praça/calçada pública.
- Suporte a foto opcional e localização.

**Regras de negócio**
- Categoria: `LIMPEZA_URBANA`.
- Subcategoria obrigatória para roteamento de equipes.
- Validação para impedir solicitação em área privada sem autorização.

### 2.4 Solicitação de manutenção em espaços públicos
**Descrição funcional**
- Demandas em praças, parques, quadras, academias ao ar livre e equipamentos públicos.
- Itens comuns: bancos quebrados, brinquedos danificados, pintura, alambrado.

**Regras de negócio**
- Categoria: `MANUTENCAO_ESPACO_PUBLICO`.
- Pode incluir checklist de risco (ex.: estrutura metálica exposta).
- Encaminhamento para secretaria responsável com base em tipo de equipamento.

### 2.5 Acompanhamento de protocolos em tempo real
**Descrição funcional**
- Tela “Meus Protocolos” com lista, filtros e linha do tempo por solicitação.
- Status obrigatórios:
  1. **Recebido**
  2. **Em análise**
  3. **Em execução**
  4. **Concluído**

**Regras de negócio**
- Todo avanço de status gera evento auditável com data/hora e servidor responsável.
- Quando concluído, cidadão pode avaliar atendimento (1 a 5 estrelas + comentário opcional).

---

## 3. Módulos do sistema

## 3.1 Módulo Mobile do Cidadão
- Cadastro e autenticação.
- Abertura de solicitações por categoria.
- Captura de foto e GPS.
- Lista de protocolos e detalhes.
- Notificações push.
- Modo offline parcial.
- Central de ajuda e termos LGPD.

## 3.2 Módulo de API e Orquestração
- API REST para app e painel administrativo.
- Regras de negócio, SLA, roteamento por secretaria/região.
- Controle de status e trilha de auditoria.
- Integração com serviço de mapas/geocodificação.
- Fila assíncrona para notificações e processamento de imagens.

## 3.3 Painel Administrativo da Prefeitura (web)
- Triagem e distribuição de chamados.
- Gestão de equipes e filas.
- Alteração de status com evidência de execução.
- Dashboard gerencial (tempo médio, volume por bairro, backlog, SLA).
- Relatórios exportáveis (CSV/PDF) para gestão e prestação de contas.

## 3.4 Módulo de Observabilidade e Governança
- Logs estruturados.
- Métricas técnicas (latência, erro, disponibilidade).
- Métricas de negócio (tempo de resolução, taxa de retrabalho, satisfação).
- Auditoria completa para conformidade.

---

## 4. Fluxos principais de usuário

## 4.1 Fluxo A — Primeira solicitação (iluminação)
1. Usuário abre o app.
2. Faz login/cadastro (CPF + e-mail ou gov.br).
3. Na home, toca em “Iluminação pública”.
4. App solicita permissão de localização e câmera.
5. Usuário preenche descrição, inclui foto (opcional), confirma ponto no mapa.
6. App valida dados e envia para API.
7. API cria protocolo, status inicial **Recebido**.
8. App exibe tela de confirmação com número do protocolo.
9. Usuário passa a acompanhar status na área “Meus Protocolos”.

## 4.2 Fluxo B — Denúncia de buraco com conectividade instável
1. Usuário seleciona “Buraco em via”.
2. Captura foto e posição GPS.
3. Sem internet no momento, app salva a solicitação localmente como “Pendente de envio”.
4. Quando conexão retorna, app sincroniza automaticamente.
5. API confirma recebimento e gera protocolo.
6. Usuário recebe push de confirmação.

## 4.3 Fluxo C — Acompanhamento e conclusão
1. Usuário abre “Meus Protocolos”.
2. Visualiza protocolo no status **Em execução**.
3. Equipe conclui serviço no painel administrativo com evidência.
4. Status muda para **Concluído**.
5. Cidadão recebe notificação push e pode avaliar o atendimento.

---

## 5. Requisitos técnicos (definição + justificativa)

## 5.1 Stack tecnológica recomendada

### Mobile
- **Flutter (Dart)**.

**Justificativa:**
- Alto desempenho em Android/iOS com base de código única.
- Boa maturidade para recursos nativos (camera, geolocalização, push).
- Forte suporte a acessibilidade e internacionalização.

### Backend/API
- **Node.js (TypeScript) + NestJS**.

**Justificativa:**
- Estrutura modular adequada para domínio público com regras de negócio extensas.
- Tipagem forte reduz erros de integração.
- Ecossistema robusto para autenticação, filas e documentação OpenAPI.

### Banco de dados
- **PostgreSQL** (transacional) + **PostGIS** (dados geoespaciais).

**Justificativa:**
- Confiável para dados relacionais de protocolo e auditoria.
- PostGIS melhora consultas por raio, região e mapas temáticos.

### Cache e filas
- **Redis** para cache e filas leves.
- **RabbitMQ** (ou SQS equivalente) para eventos assíncronos e alta resiliência.

### Painel administrativo
- **React + TypeScript + Material UI**.

**Justificativa:**
- Rapidez no desenvolvimento de interfaces administrativas complexas.
- Ótimo suporte a tabelas, filtros avançados e formulários de operação.

### Infraestrutura
- Containers com **Docker**.
- Orquestração em Kubernetes (ou serviço gerenciado equivalente).
- CI/CD com validações automatizadas, testes e análise de segurança.

## 5.2 Arquitetura do sistema

### Visão em camadas
1. **Camada de apresentação**
   - App Mobile (cidadão).
   - Painel Web (servidores/gestores).
2. **Camada de serviço/API**
   - API Gateway + serviços de autenticação, solicitações, protocolos e notificações.
3. **Camada de domínio**
   - Regras de categorização, SLA, priorização e distribuição.
4. **Camada de dados**
   - PostgreSQL/PostGIS, armazenamento de arquivos (fotos) em objeto (ex.: S3).
5. **Camada de integração**
   - Push (FCM/APNs), gov.br, mapas/geocodificação.

### Diagrama textual
```text
[App Mobile Flutter] ----\
                           >---- [API Gateway / NestJS] ---- [Auth Service]
[Painel Web React] ------/                  |               [Solicitações Service]
                                            |               [Protocolos Service]
                                            |               [Notificações Service]
                                            |
                                            +---- [PostgreSQL + PostGIS]
                                            +---- [Redis]
                                            +---- [Fila (RabbitMQ)]
                                            +---- [Storage de Imagens]
                                            +---- [Integração gov.br / FCM / APNs / Mapas]
```

## 5.3 Autenticação do cidadão

### Opções suportadas
1. **CPF + e-mail + senha** (fluxo básico municipal).
2. **Integração gov.br (OIDC/OAuth2)** para identidade federada.

### Recomendação
- Adotar estratégia híbrida:
  - Login local para inclusão digital ampla.
  - gov.br opcional para maior segurança e redução de fraude de identidade.

### Regras mínimas
- Validação de CPF.
- Verificação de e-mail por código.
- Recuperação de conta segura.
- MFA opcional para usuários e obrigatório para perfis administrativos.

## 5.4 Notificações push
- Disparo em eventos de protocolo (criação, mudança de status, conclusão, pedido de complemento).
- Entrega via FCM (Android) e APNs (iOS), abstraída no backend.
- Log de envio (sucesso/falha) para auditoria e retentativas.

## 5.5 Modo offline parcial

### Escopo offline recomendado
- Abertura de solicitação com dados essenciais.
- Armazenamento local criptografado de rascunhos e pendências.
- Fila de sincronização com política “first in, first out”.

### Resolução de conflitos
- Solicitação enviada localmente recebe ID temporário.
- Após sincronização, backend devolve protocolo oficial.
- App mantém vínculo entre ID local e protocolo real.

## 5.6 Acessibilidade (WCAG 2.1)
- Contraste mínimo AA.
- Navegação por leitores de tela (TalkBack/VoiceOver) com labels semânticos.
- Ajuste de tamanho de fonte e suporte a escalonamento do sistema.
- Botões com área mínima de toque.
- Feedback não apenas por cor (ícones/texto auxiliares).
- Testes com usuários reais e checklist WCAG por release.

---

## 6. Estrutura de dados e entidades principais

## 6.1 Entidades centrais

### Usuario
- `id` (UUID)
- `nome`
- `cpf` (hash + dado mascarado para exibição)
- `email`
- `telefone`
- `tipo_autenticacao` (`LOCAL`, `GOV_BR`)
- `govbr_sub` (opcional)
- `created_at`, `updated_at`

### Solicitacao
- `id` (UUID)
- `protocolo_numero` (único)
- `usuario_id` (FK)
- `categoria_servico_id` (FK)
- `subcategoria`
- `descricao`
- `status_atual` (`RECEBIDO`, `EM_ANALISE`, `EM_EXECUCAO`, `CONCLUIDO`)
- `prioridade` (`BAIXA`, `MEDIA`, `ALTA`)
- `endereco_texto`
- `latitude`, `longitude` (PostGIS point)
- `bairro`, `regional`
- `canal_origem` (`APP`)
- `created_at`, `updated_at`, `concluido_at`

### Anexo
- `id`
- `solicitacao_id` (FK)
- `tipo_arquivo` (foto/documento)
- `url_armazenamento`
- `hash_integridade`
- `created_at`

### HistoricoStatus
- `id`
- `solicitacao_id` (FK)
- `status`
- `observacao`
- `alterado_por` (usuário admin/sistema)
- `alterado_em`

### CategoriaServico
- `id`
- `codigo` (`ILUMINACAO_PUBLICA`, `BURACO_EM_VIA`, etc.)
- `nome_exibicao`
- `secretaria_responsavel`
- `sla_horas`
- `ativo`

### ProtocoloAtendimento (visão lógica)
- Número único exibido ao cidadão.
- Consolidado de dados da solicitação + timeline + previsão de atendimento.

## 6.2 Índices e regras recomendadas
- Índice único em `protocolo_numero`.
- Índices geoespaciais em localização.
- Índices por `status_atual`, `categoria_servico_id`, `created_at`.
- Política de retenção para anexos e trilha de auditoria.

---

## 7. Painel administrativo para servidores municipais

## 7.1 Perfis de acesso
- **Atendente**: triagem inicial, validação de dados, contato com cidadão.
- **Operador de Secretaria**: execução e atualização de status.
- **Gestor**: visão de indicadores, redistribuição de carga, relatórios.
- **Administrador**: parametrização de categorias, SLA, usuários internos.

## 7.2 Funcionalidades do painel
- Fila por status, bairro, categoria, prioridade e tempo de espera.
- Mapa de calor de ocorrências para planejamento territorial.
- Alteração de status com comentários internos e externos.
- Upload de evidências de execução (antes/depois).
- Reabertura de protocolo sob justificativa.
- Gestão de SLA com alertas automáticos de estouro.

## 7.3 Indicadores-chave (KPIs)
- Tempo médio de primeira resposta.
- Tempo médio de conclusão por categoria.
- Percentual dentro do SLA.
- Volume por bairro/regional.
- Taxa de retrabalho/reabertura.
- Satisfação do cidadão pós-conclusão.

---

## 8. Roadmap de desenvolvimento (fases priorizadas)

## Fase 0 — Descoberta e base institucional (2 a 4 semanas)
- Levantamento de requisitos legais e operacionais por secretaria.
- Mapeamento de processos atuais (AS-IS) e desenho alvo (TO-BE).
- Definição de KPIs e SLAs oficiais.

## Fase 1 — MVP cidadão + operação mínima (8 a 12 semanas)
- Cadastro/login (CPF + e-mail).
- 4 categorias obrigatórias de solicitação.
- Acompanhamento de protocolo com 4 status.
- Painel administrativo básico com triagem e atualização.
- Push de alteração de status.

## Fase 2 — Escala operacional (6 a 8 semanas)
- Integração gov.br.
- Modo offline parcial com sincronização automática.
- Regras de duplicidade geográfica.
- Relatórios gerenciais e dashboards de SLA.

## Fase 3 — Maturidade digital (6 a 10 semanas)
- Motor de priorização inteligente por risco/impacto.
- Integração com sistemas legados (ouvidoria, protocolo geral, ERP).
- Analytics avançado e planejamento preditivo de manutenção.

## Fase 4 — Melhoria contínua (contínuo)
- Revisões trimestrais de UX e acessibilidade.
- Ajustes de capacidade e custo de infraestrutura.
- Auditorias de segurança e privacidade recorrentes.

---

## 9. Segurança, privacidade (LGPD) e escalabilidade

## 9.1 Segurança da informação
- Criptografia em trânsito (TLS 1.2+) e em repouso (banco e storage).
- Controle de acesso com RBAC e princípio do menor privilégio.
- Assinatura de eventos críticos e trilha de auditoria imutável.
- Proteções API: rate limit, WAF, validação de payload, proteção anti-bot.
- Gestão segura de segredos (vault) e rotação periódica.

## 9.2 LGPD
- Bases legais claras (execução de políticas públicas/interesse público, conforme contexto municipal).
- Consentimento explícito quando necessário (ex.: notificações não essenciais).
- Minimização de dados e retenção por prazo definido em política pública.
- Direitos do titular: acesso, correção e anonimização quando aplicável.
- Registro de operações de tratamento (ROPA) e encarregado (DPO) definido.

## 9.3 Escalabilidade e resiliência
- Serviços stateless com autoescalonamento horizontal.
- Filas assíncronas para absorver picos de demanda (chuvas, eventos críticos).
- Banco com replicação e estratégia de backup/restauração testada.
- CDN e otimização de mídia para anexos de imagem.
- SLOs operacionais e plano de continuidade de negócio.

---

## 10. Critérios de aceite recomendados para entrega à equipe
- Documento de requisitos validado com todas as secretarias envolvidas.
- OpenAPI publicada com contratos versionados.
- Protótipo navegável (mobile + painel) aprovado por área de negócio.
- Plano de testes (funcional, segurança, acessibilidade, carga) definido.
- Estratégia de implantação com ambiente de homologação e produção.

## 11. Conclusão executiva
A proposta apresentada viabiliza um aplicativo municipal robusto, escalável e orientado a dados, com benefícios diretos para cidadania digital, transparência e eficiência administrativa. A arquitetura recomendada permite iniciar com MVP de alto impacto e evoluir para um ecossistema inteligente de gestão urbana, mantendo aderência a segurança pública digital, acessibilidade e LGPD.
