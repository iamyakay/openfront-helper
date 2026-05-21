/** i18n keys for filter labels (match shared/i18n DEFAULT_TRANSLATIONS / locale JSON). */

export const LOBBY_TYPE_FILTERS = [
  { key: "ffaLobby", titleKey: "FFA" },
  { key: "duosLobby", titleKey: "Duos" },
  { key: "triosLobby", titleKey: "Trios" },
  { key: "quadsLobby", titleKey: "Quads" },
  {
    key: "teamsLargerThanTriosLobby",
    titleKey: "Teams larger than Quads",
    descKey: "Matches team lobbies with more than 4 players per team.",
  },
] as const;

export const MODIFIER_FILTERS = [
  { key: "randomSpawn", titleKey: "Random spawn" },
  { key: "alliancesDisabled", titleKey: "Alliances disabled" },
  { key: "portsDisabled", titleKey: "Ports disabled" },
  { key: "nukesDisabled", titleKey: "Nukes disabled" },
  { key: "samsDisabled", titleKey: "SAMs disabled" },
  { key: "waterNukes", titleKey: "Water nukes" },
  { key: "peaceTime4m", titleKey: "4min peace time" },
  { key: "goldMultiplier2x", titleKey: "2x gold" },
] as const;

export const START_GOLD_FILTERS = [
  {
    key: "startingGold0M",
    titleKey: "0M starting gold",
    descKey: "Default case with no explicit starting gold.",
  },
  { key: "startingGold1M", titleKey: "1M starting gold" },
  { key: "startingGold5M", titleKey: "5M starting gold" },
  { key: "startingGold25M", titleKey: "25M starting gold" },
] as const;

export type GameHelperToggle = {
  name:
    | "markBotNationsRed"
    | "markHoveredAlliesGreen"
    | "showAllianceRequestsPanel"
    | "showNukePrediction"
    | "showBoatPrediction";
  titleKey: string;
  descKey: string;
  infoImage: string;
  infoAriaKey?: string;
};

export const GAME_HELPERS: GameHelperToggle[] = [
  {
    name: "markBotNationsRed",
    titleKey: "Mark bot nations red",
    descKey: "Adds a red marker to nation AI names on the map.",
    infoImage: "assets/info-images/mark_bot_nations_red_info.png",
    infoAriaKey: "Show Mark bot nations red preview",
  },
  {
    name: "markHoveredAlliesGreen",
    titleKey: "Alliances",
    descKey: "Highlights allies with remaining alliance time.",
    infoImage: "assets/info-images/show_alliances_info.png",
    infoAriaKey: "Show alliances preview",
  },
  {
    name: "showAllianceRequestsPanel",
    titleKey: "Alliance requests panel",
    descKey:
      "Moves alliance requests and renewal prompts into a separate right-side window.",
    infoImage: "assets/info-images/alliance_requests_info.png",
    infoAriaKey: "Show alliances preview",
  },
  {
    name: "showNukePrediction",
    titleKey: "Nuke prediction",
    descKey:
      "Shows predicted enemy nuke landing points and explosion radius.",
    infoImage: "assets/info-images/nuke_landing_zones.png",
    infoAriaKey: "Show Nuke prediction preview",
  },
  {
    name: "showBoatPrediction",
    titleKey: "Boat prediction",
    descKey:
      "Shows enemy boat landing points. Red = targeting you, yellow = targeting others.",
    infoImage: "assets/info-images/boat_prediction_info.png",
    infoAriaKey: "Boat prediction",
  },
];

export type EconomicHelperToggle = {
  name:
    | "showGoldPerMinute"
    | "showTeamGoldPerMinute"
    | "showTopGoldPerMinute"
    | "showMyGpmHistory"
    | "showTradeBalances";
  titleKey: string;
  descKey: string;
  infoImage?: string;
  infoAriaKey?: string;
};

export const ECONOMIC_HELPERS: EconomicHelperToggle[] = [
  {
    name: "showGoldPerMinute",
    titleKey: "Gold per minute",
    descKey: "Adds GPM to the player hover panel.",
    infoImage: "assets/info-images/show_gold_per_minute_info.png",
    infoAriaKey: "Show gold per minute preview",
  },
  {
    name: "showTeamGoldPerMinute",
    titleKey: "Team gold per minute",
    descKey: "Lists each team's total GPM in team games.",
    infoImage: "assets/info-images/show_team_gold_per_minute_info.png",
    infoAriaKey: "Show team gold per minute preview",
  },
  {
    name: "showTopGoldPerMinute",
    titleKey: "Top 10 gold per minute",
    descKey: "Lists the highest tracked player GPM.",
  },
  {
    name: "showMyGpmHistory",
    titleKey: "My GPM history",
    descKey:
      "Charts your own GPM over time in 10 second samples. Hover the graph for a value at any moment.",
  },
  {
    name: "showTradeBalances",
    titleKey: "Trade balances",
    descKey: "Shows observed ship and train trade imports and exports.",
    infoImage: "assets/info-images/trade_balance_info.png",
    infoAriaKey: "Show trade balances preview",
  },
];
