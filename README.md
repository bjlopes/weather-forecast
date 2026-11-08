# Alerta Rio · Tempo e chuva

App web com chuva e meteorologia das estações do **Sistema Alerta Rio** (Centro de Operações Rio).

## O que faz

- Previsão sinótica e detalhada do boletim COR
- Previsão dos próximos dias (texto COR + tabela estendida Alerta Rio)
- Temperaturas mín/máx e tendência oficiais do Alerta Rio
- Live feed animado do Radar Meteorológico do Sumaré
- Lista estações pluviométricas com acumulados (15 min, 1h, 4h, 24h, 96h, mês)
- Filtra por zona (Zona Sul, Baía de Guanabara, Barra/Jacarepaguá, Baía de Sepetiba)
- Mostra temperatura, umidade e vento quando disponíveis
- Exibe estágios de chuva / risco de escorregamento quando publicados

**Somente** Sistema Alerta Rio / COR. Nenhuma outra fonte meteorológica. Se a origem ao vivo estiver inacessível, o app usa amostra embutida e avisa na interface.

## Como rodar

```bash
npm install
npm run dev
```

Abra http://127.0.0.1:3847

## Fontes oficiais

- https://alertario.rio.rj.gov.br/
- https://alertario.rio.rj.gov.br/upload/TempoReal.html
- https://alertario.rio.rj.gov.br/upload/Previsao.html
- https://alertario.rio.rj.gov.br/upload/PrevisaoEstendida.html
- https://alertario.rio.rj.gov.br/radar-meteorologico-do-sumare/imgens-recentes/
- https://cor.rio/ (boletim textual)
