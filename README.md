# Alerta Rio · Tempo e chuva

App web com chuva e meteorologia das estações do **Sistema Alerta Rio** (Centro de Operações Rio).

## O que faz

- Lista estações pluviométricas com acumulados (15 min, 1h, 4h, 24h, 96h, mês)
- Filtra por zona (Zona Sul, Baía de Guanabara, Barra/Jacarepaguá, Baía de Sepetiba)
- Mostra temperatura, umidade e vento quando disponíveis
- Exibe estágios de chuva / risco de escorregamento quando publicados

Se o servidor municipal estiver inacessível, o app usa uma amostra embutida e avisa na interface.

## Como rodar

```bash
npm install
npm run dev
```

Abra http://127.0.0.1:3847

## Fonte oficial

- https://alertario.rio.rj.gov.br/
- https://websempre.rio.rj.gov.br/estacoes/
