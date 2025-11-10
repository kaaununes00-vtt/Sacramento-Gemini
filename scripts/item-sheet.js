
export class SacramentoItemSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["sacramento", "sheet", "item", "sac-item"],
      template: "systems/sacramento-rpg/templates/item/item-sheet.hbs",
      width: 640,
      height: 720,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "desc" }],
      submitOnChange: true
    });
  }

  getData(options = {}) {
    const data = super.getData(options);
    // sane defaults
    const s = (this.item.system ??= {});
    s.categoria ??= "";
    s.capacidade ??= 0;
    s.municao ??= 0;
    s.recargaAcoes ??= 0;
    s.alcance ??= "";
    s.preco ??= "";
    s.espaco ??= "";
    s.dano ??= (s.dano ?? {});
    s.dano.circulos ??= 0;
    s.dano.tipo ??= "";
    s.municaoTipo ??= "";      // para "municao: <tipo>"
    s.municaoCaixa ??= 0;      // balas por caixa
    return data;
  }
}
