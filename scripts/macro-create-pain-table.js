
// Macro: Criar Tabela 'Penalidades de Dor' (execute uma vez)
(async () => {
  let table = await RollTable.create({
    name: "Penalidades de Dor",
    formula: "1d6",
    replacement: true,
    displayRoll: true,
    results: [
      {type: 0, text: "Atordoado: perde a próxima Ação.", range: [1,1]},
      {type: 0, text: "Queda: cai ao chão, perde 1 Movimento.", range: [2,2]},
      {type: 0, text: "Sangramento: sofre -1 em Testes até ser tratado.", range: [3,3]},
      {type: 0, text: "Tontura: Defesa -1 até o fim da rodada.", range: [4,4]},
      {type: 0, text: "Mãos trêmulas: não pode Mirar neste turno.", range: [5,5]},
      {type: 0, text: "Desorientado: age por último na próxima rodada.", range: [6,6]}
    ]
  });
  ui.notifications.info("Tabela criada.");
})();
