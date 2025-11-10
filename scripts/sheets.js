// systems/sacramento-rpg/scripts/sheets.js
// v13 — helpers, preload, sheets e listeners (com autosave seguro + leitura de DOM)

Hooks.once("init", () => {
  Handlebars.registerHelper("gt",  (a,b)=>Number(a)>Number(b));
  Handlebars.registerHelper("gte", (a,b)=>Number(a)>=Number(b));
  Handlebars.registerHelper("eq",  (a,b)=>a===b);
  Handlebars.registerHelper("range", (start,end)=>{
    start=Number(start); end=Number(end);
    const arr=[]; for (let i=start;i<=end;i++) arr.push(i); return arr;
  });
  Handlebars.registerHelper("array", (args)=>args.slice(0,-1));
  Handlebars.registerHelper("uppercase", (s)=>String(s).toUpperCase());
  Handlebars.registerHelper("percent", (v,max)=>{
    v=Number(v)||0; max=Number(max)||1;
    const p=Math.round((v/max)*100);
    return Math.max(0, Math.min(100, p));
  });
});

Hooks.once("ready", async () => {
  await loadTemplates([
    "systems/sacramento-rpg/templates/actor/character-sheet.hbs",
    "systems/sacramento-rpg/templates/actor/npc-sheet.hbs",
    "systems/sacramento-rpg/templates/item/item-sheet.hbs"
  ]);
});

class SacramentoActorSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      submitOnChange: true,
      closeOnSubmit: false,
      submitOnClose: true,
      classes: ["sacramento","sheet","actor"],
      template: "systems/sacramento-rpg/templates/actor/character-sheet.hbs",
      width: 860,
      height: 680,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "personagem" }]
    });
  }

  getData(options = {}) {
  const data = super.getData(options);

// Inventory classification: weapons, ammo (unique types), others
const itemsAll = this.actor.items.contents ?? Array.from(this.actor.items);
const weapons = itemsAll.filter(i => i.type === "arma");
const others  = itemsAll.filter(i => i.type !== "arma");

// Detect ammo by category or name heuristics
const ammoTypeOf = (it) => {
  const cat = String(it.system?.categoria ?? "").toLowerCase();
  const nm  = String(it.name ?? "").toLowerCase();
  let key = null;
  if (cat.includes("muni")) key = cat.replace(/^.*muni[^:]*:?\s*/,'').trim() || cat;
  else if (nm.startsWith("muni")) key = nm.replace(/^muni[^:]*:?\s*/,'').trim() || nm;
  return key; // null if not ammo-like
};

const ammoMap = new Map();
const packDisplay = [];
for (const it of others) {
  const ammoKey = ammoTypeOf(it);
  if (ammoKey) {
    if (!ammoMap.has(ammoKey)) ammoMap.set(ammoKey, []);
    ammoMap.get(ammoKey).push(it);
  } else {
    packDisplay.push(it);
  }
}
const ammoGroups = Array.from(ammoMap.entries()).map(([type, list]) => ({ type, items: list }));

const combinedCount = weapons.length + ammoGroups.length + packDisplay.length;
data.inventory = {
  capacity: 10,
  combinedCount,
  weapons,
  ammoGroups,
  packDisplay
};
      // Derived counts to avoid handlebars arithmetic in templates
      data.inventory.packCountDisplay = packDisplay.length + ammoGroups.length;


  const items = this.actor.items.contents ?? Array.from(this.actor.items);
  data.weapons   = items.filter(i => i.type === "arma");
  data.packItems = items.filter(i => i.type !== "arma");
  data.pack = { count: data.packItems.length, capacity: 10 };
  data.holster = { count: data.weapons.length };
  return data;
}

  // Salva mudanças de inputs numéricos sem precisar fechar a ficha.
  async _autosave(html) {
    const form = this.form || html.closest("form")[0] || html.find("form")[0];
    if (!form) return;
    const fd = new FormData(form);
    const data = foundry.utils.expandObject(Object.fromEntries(fd));
    // Atualiza apenas a raiz system.* que vier no form (o Foundry ignora o resto)
    await this.actor.update(data);
  }
  async _updateObject(event, formData) { await this.object.update(formData); }

  activateListeners(html) {
    super.activateListeners(html);

    
    // Theme toggle button in window header
    try {
      const app = html.closest(".app");
      const hdr = app.find(".window-header .window-title");
      if (hdr && !app.find(".sac-theme-toggle").length) {
        const cur = game.settings.get("sacramento-rpg", "theme");
        const icon = $('<a class="sac-theme-toggle" title="Alternar tema">🌓</a>');
        icon.css({ marginLeft: "8px", cursor: "pointer", userSelect: "none" });
        icon.on("click", async () => {
          const cur = game.settings.get("sacramento-rpg", "theme");
          const next = (cur === "dark") ? "light" : "dark";
          await game.settings.set("sacramento-rpg", "theme", next);
        });
        hdr.after(icon);
      }
    } catch(e) { console.warn("Sacramento theme toggle:", e); }
// --- AUTOSAVE DISCRETO ---
    // change/focusout garantem que o valor digitado vá para actor.system
    html.on("change", 'input[name^="system."]', async ev => {
      await this._autosave(html);
    });
    html.on("focusout", 'input[name^="system."]', async ev => {
      await this._autosave(html);
    });

    // --- utilitários ---
    const flash = (el) => { el.classList.add("click-flash"); setTimeout(()=>el.classList.remove("click-flash"), 180); };

    // lê direto do DOM (mesmo com foco) e cai para actor.system como fallback
    const readMod = (paths) => {
      for (const p of paths) {
        const el = html.find(`input[name="${p}"]`);
        if (el && el.length) {
          const v = Number(el.val());
          if (!Number.isNaN(v)) return v;
        }
      }
      for (const p of paths) {
        const v = Number(foundry.utils.getProperty(this.actor.system, p) ?? 0);
        if (!Number.isNaN(v) && (v !== 0)) return v;
      }
      return 0;
    };

    // --- Rolagens: Antecedentes (rótulo ou botão 1d6+) ---
    html.find('.skill-roll, .btn-roll-antecedente').off('click.sac').on('click.sac', async ev => {
      const el = ev.currentTarget; flash(el);
      const key = el.getAttribute('data-skill');
      const mod = readMod([
        `system.antecedentes.${key}`,
        `system.antecedentes.${key}.value`
      ]);
      await this._autosave(html);
      if (game.sacramento?.rollD6) {
        await game.sacramento.rollD6(mod, 6, { flavor: `Teste de ${String(key).toUpperCase()}` });
      } else {
        const r = await (new Roll(`1d6 + ${mod}`)).evaluate({async:true});
        r.toMessage({ speaker: ChatMessage.getSpeaker({actor: this.actor}), flavor: `Teste de ${String(key).toUpperCase()}` });
      }
    });

    // --- Rolagens: Atributos (rótulo) ---
    html.find('.attr-roll').off('click.sac').on('click.sac', async ev => {
      const el = ev.currentTarget; flash(el);
      const key = el.getAttribute('data-attr');
      const mod = readMod([
        `system.atributos.${key}`,
        `system.atributos.${key}.value`
      ]);
      await this._autosave(html);
      if (game.sacramento?.rollD6) {
        await game.sacramento.rollD6(mod, 6, { flavor: `Teste de ${String(key).toUpperCase()}` });
      } else {
        const r = await (new Roll(`1d6 + ${mod}`)).evaluate({async:true});
        r.toMessage({ speaker: ChatMessage.getSpeaker({actor: this.actor}), flavor: `Teste de ${String(key).toUpperCase()}` });
      }
    });

    // --- Círculos Vida/Dor (valor) ---
// --- Círculos Vida/Dor (valor) ---
    const clamp = (v,min,max)=> Math.max(min, Math.min(max, v));

    html.find('.skulls[data-type="vida"] .skull').on('click', async ev => {
      const idx = Number(ev.currentTarget.dataset.index);
      const max = this.actor.system.recursos.vida.max ?? 6;
      const cur = this.actor.system.recursos.vida.value ?? max;
      const nv = (idx===cur) ? (cur-1) : idx;
      await this.actor.update({ "system.recursos.vida.value": clamp(nv, 0, max) });
    });

    html.find('.skulls[data-type="dor"] .skull').on('click', async ev => {
      const idx = Number(ev.currentTarget.dataset.index);
      const max = this.actor.system.recursos.dor.max ?? 6;
      const cur = this.actor.system.recursos.dor.value ?? 0;
      const nv = (idx===cur) ? (cur-1) : idx;
      await this.actor.update({ "system.recursos.dor.value": clamp(nv, 0, max) });
    });

    // --- Círculos Vida/Dor (máximo) ---
    html.find('.skulls-add').on('click', async ev => {
      const stat = ev.currentTarget.dataset.stat;
      const path = stat === "vida" ? "system.recursos.vida.max" : "system.recursos.dor.max";
      const cur = foundry.utils.getProperty(this.actor, path) ?? 6;
      await this.actor.update({ [path]: Number(cur) + 1 });
    });

    html.find('.skulls-sub').on('click', async ev => {
      const stat = ev.currentTarget.dataset.stat;
      const base = (stat==="vida") ? this.actor.system.recursos.vida : this.actor.system.recursos.dor;
      const newMax = Math.max(1, Number(base.max||1) - 1);
      const updates = {};
      if (stat==="vida") {
        updates["system.recursos.vida.max"] = newMax;
        if (base.value > newMax) updates["system.recursos.vida.value"] = newMax;
      } else {
        updates["system.recursos.dor.max"] = newMax;
        if (base.value > newMax) updates["system.recursos.dor.value"] = newMax;
      }
      await this.actor.update(updates);
    });

    // --- Itens (abrir/atacar/recarregar) ---
    html.find(".item-row .item-open").on("click", ev => {
      const id = ev.currentTarget.closest(".item-row").dataset.itemId;
      this.actor.items.get(id)?.sheet?.render(true);
    });

    html.find(".item-row .item-attack").on("click", ev => {
      const id = ev.currentTarget.closest(".item-row").dataset.itemId;
      const item = this.actor.items.get(id);
      const alvo = Array.from(game.user.targets)[0]?.actor;
      const defesa = alvo?.system?.combate?.defesa ?? 5;
      game.sacramento?.attackWithItem?.(this.actor, item, defesa);
    });

    html.find(".item-row .item-reload").on("click", ev => {
      const id = ev.currentTarget.closest(".item-row").dataset.itemId;
      const item = this.actor.items.get(id);
      game.sacramento?.reloadItem?.(item);
    });
  }
}

class SacramentoItemSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["sacramento","sheet","item"],
      template: "systems/sacramento-rpg/templates/item/item-sheet.hbs",
      width: 520, height: 420
    });
  }
}

Hooks.once("init", () => {
  Actors.registerSheet("sacramento-rpg", SacramentoActorSheet, { types: ["character"], makeDefault: true });
  Items.registerSheet("sacramento-rpg", SacramentoItemSheet, { makeDefault: true });
});
