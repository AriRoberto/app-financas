# Como rodar o app localmente

## Pré-requisitos
- Node.js 20+
- npm 10+

## Configuração
1. Copie `.env.example` para `.env`.
2. Preencha credenciais do agregador AISP.
3. Em desenvolvimento, você pode manter `OPEN_FINANCE_MOCK=true` para usar o mock interno.

## Instalação
```bash
cd backend && npm install
cd ../frontend && npm install
```

## Execução
Terminal 1:
```bash
cd backend
npm run dev
```

Terminal 2:
```bash
cd frontend
npm run dev
```

Abra: `http://localhost:5173`

## Open Finance (mock local)
1. Na tela, escolha Banco do Brasil, Itaú, Caixa (CEF), Santander, Nubank ou Bradesco.
2. Clique em **Conectar Banco**.
3. O app faz consentimento + callback + sync inicial automaticamente via mock AISP.
4. Use **Sincronizar** para sync manual e **Revogar** para encerrar consentimento e limpar tokens.

## Uso rápido de finanças
1. Selecione o membro no filtro global: `all`, `marido`, `esposa` ou `familia`.
2. Ajuste período (mês, 3 meses, ano, custom) e prazo (`short`, `medium`, `long`).
3. Cadastre despesas/receitas/investimentos no formulário.
4. Para reserva para investir:
   - marque o checkbox **Reserva para investir** ou use categoria `Reserva para investir`;
   - a saída conta em despesas e também aparece em `/api/investments`.
5. Use **Trazer dados de teste** para repor a massa de demonstração.
6. Use **Limpar dados de teste** para zerar todos os lançamentos do ambiente atual.

## Testes backend
```bash
cd backend
npm test
```
