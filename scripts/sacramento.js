// systems/sacramento-rpg/scripts/sacramento.js
// Sacramento RPG system helpers for Foundry VTT v13.

// Ensure global namespace for the system exists.
game.sacramento = game.sacramento || {};

/**
 * Roll a six-sided die with a modifier and compare against a target. Displays
 * the result in the chat as a multi‑line message in Portuguese. A natural 6
 * produces "Crítico!" and a natural 1 produces "Falha!" on the second line.
 *
 * @param {number} [mod=0]    Modifier to add to the d6 roll.
 * @param {number} [target=6] Target number to compare against (default 6).
 * @param {Object} [opts={}]  Optional options object.
 * @param {string} [opts.flavor] Flavour text for the chat message.
 * @returns {Promise<{roll: Roll, success: boolean, nat: number|null, total: number}>}
 */
game.sacramento.rollD6 = async function (mod = 0, target = 6, { flavor = "" } = {}) {
  // Normalise numeric inputs
  mod = Number(mod) || 0;
  const tgt = Number(target) || 6;

  // Create and evaluate the roll
  const formula = `1d6 + ${mod}`;
  const roll = await (new Roll(formula)).evaluate({ async: true });

  // Extract the natural die result (first d6) if available
  let nat = null;
  try {
    const term = roll.terms && roll.terms[0];
    nat = (term?.results && term.results[0]?.result) ?? null;
  } catch (_) {
    nat = null;
  }

  // Compute total and determine success
  const total = Number(roll.total ?? ((nat ?? 0) + mod));
  const success = total >= tgt;

  // Build content string: title line + optional crit/fail line
  let content = `**${flavor || "Teste"} (NA ${tgt}): 1d6 + ${mod} → Total: ${total}**`;
  if (nat === 6) content += `<br>Crítico!`;
  else if (nat === 1) content += `<br>Falha!`;

  // Output: show the roll details then our custom message
  await roll.toMessage({ flavor: "", speaker: ChatMessage.getSpeaker() });
  await ChatMessage.create({ content });
  return { roll, success, nat, total };
};

/**
 * Perform an attack with a weapon item. Consumes ammo from firearms, rolls to
 * determine if the attack hits (using the actor's Violência antecedent as
 * modifier), and outputs a chat message describing the result and damage.
 *
 * @param {Actor} actor  The attacking actor.
 * @param {Item} item    The weapon item being used.
 * @param {number} defesa The defence value of the target.
 */
game.sacramento.attackWithItem = async function (actor, item, defesa) {
  if (!actor || !item) return;
  // Consume ammo if firearm
  if (item.type === "arma" && item.system?.capacidade) {
    const mun = Number(item.system?.municao || 0);
    if (mun <= 0) {
      ui.notifications?.warn(`${item.name}: sem munição.`);
      return;
    }
    await item.update({ "system.municao": mun - 1 });
  }
  // Determine attack modifier from actor's Violência antecedente
  const mod = Number(actor.system?.antecedentes?.violencia || 0);
  // Roll and compare
  const result = await game.sacramento.rollD6(mod, defesa, { flavor: `Ataque com ${item.name}` });
  if (result.success) {
    const dano = item.system?.dano || { tipo: "vida", circulos: 1 };
    const tipo = (dano.tipo || "vida").toLowerCase();
    const msg = `Acerto! Dano: ${dano.circulos} ${tipo === "vida" ? "Vida" : "Dor"}.`;
    ChatMessage.create({ content: msg });
    // Real damage application must be handled by the caller (reduce life/pain circles)
  } else {
    ChatMessage.create({ content: "Errou o ataque." });
  }
};

/**
 * Reload a weapon item to its full capacity. Only applies to items of type
 * "arma". Sends a notification if called on an inappropriate item type.
 *
 * @param {Item} item The weapon item to reload.
 */
game.sacramento.reloadItem = async function (item) {
  if (!item || item.type !== "arma") {
    ui.notifications?.warn("Apenas armas têm recarga.");
    return;
  }
  const cap = Number(item.system?.capacidade || 0);
  await item.update({ "system.municao": cap });
  ChatMessage.create({ content: `${item.name}: recarregada (${cap}).` });
};

// === Sacramento RPG: Theme setting (client) ===
Hooks.once("init", () => {
  game.settings.register("sacramento-rpg", "theme", {
    name: "Tema da Interface",
    hint: "Escolha entre Claro ou Escuro para a interface do sistema Sacramento.",
    scope: "client",
    config: true,
    type: String,
    choices: { light: "Claro", dark: "Escuro" },
    default: "light",
    onChange: value => {
      document.body.classList.toggle("sac-dark", value === "dark");
    }
  });
});

Hooks.once("ready", () => {
  const value = game.settings.get("sacramento-rpg", "theme");
  document.body.classList.toggle("sac-dark", value === "dark");
});


import { SacramentoItemSheet } from "./item-sheet.js";

Hooks.once("init", () => {
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("sacramento-rpg", SacramentoItemSheet, { makeDefault: true });
});
