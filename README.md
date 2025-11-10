# Sacramento RPG (FoundryVTT System)

Versão inicial 2025-11-10

## Recursos
- Testes: 1d6 + modificadores (NA 6 por padrão).
- Forçar Rolagem: NA -1 com consequência negativa (hook `sacramentoForceConsequence`).
- Vida/Dor: ícones de caveira com automação de penalidade ao atingir 6 de Dor.
- Combate: iniciativa por cartas (baralho de poker). Ações/Movimentos editáveis na ficha.
- NPCs: NdC, Ações por Turno, IA simples (ataque contra alvo selecionado).
- Tabela de Penalidades de Dor (adicione no compêndio `tables`).

## Instalação
1. Descompacte na pasta `Data/systems/sacramento-rpg`.
2. No Foundry, selecione o sistema ao criar o Mundo.

## Próximos passos
- Integrar sua ficha já existente no lugar de `templates/actor/character-sheet.hbs`.
- Adicionar armas, itens e macros nas `packs`.
- Refinar tema visual e tipografia western.
