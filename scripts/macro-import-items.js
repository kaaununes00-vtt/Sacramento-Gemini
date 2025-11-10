
// Macro: Importar Itens Padrão Sacramento (do compêndio)
// Execute uma vez para arrastar os itens para o seu Mundo.
(async () => {
  const pack = game.packs.get("sacramento-rpg.items");
  if (!pack) return ui.notifications.error("Compêndio 'Itens - Sacramento' não encontrado.");
  const docs = await pack.getDocuments();
  for (let d of docs) {
    await Item.create(d.toObject());
  }
  ui.notifications.info("Itens padrão importados para o Mundo.");
})();
