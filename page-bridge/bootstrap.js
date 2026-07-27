// Final message routing and bridge startup.

  // Individual bridge scripts can fail to load (the injector logs and
  // continues the chain), so every handler is invoked through this guard.
  // Otherwise one missing script would make the message listener throw and
  // silently break every helper handled after it.
  const _missingBridgeHandlers = new Set();

  function callBridgeHandler(name, ...args) {
    const handler = globalThis[name];
    if (typeof handler === "function") {
      handler(...args);
      return;
    }
    if (!_missingBridgeHandlers.has(name)) {
      _missingBridgeHandlers.add(name);
      console.error(
        `OpenFront helper: bridge handler ${name} not loaded (a page-bridge script failed to load; check manifest web_accessible_resources)`,
      );
    }
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window) {
      return;
    }

    const data = event.data;
    if (!data || data.source !== EXTENSION_SOURCE) {
      return;
    }

    if (data.type === "JOIN_PUBLIC_LOBBY" && data.payload?.gameID) {
      document.dispatchEvent(
        new CustomEvent("join-lobby", {
          detail: {
            gameID: data.payload.gameID,
            source: "public",
            publicLobbyInfo: data.payload.publicLobbyInfo,
          },
          bubbles: true,
          composed: true,
        }),
      );
    }

    if (data.type === "MARK_BOT_NATIONS_RED") {
      callBridgeHandler("setBotMarkersEnabled", data.payload?.enabled);
    }

    if (data.type === "SHOW_GOLD_PER_MINUTE") {
      callBridgeHandler("setGoldPerMinuteEnabled", data.payload?.enabled);
    }

    if (data.type === "SHOW_TEAM_GOLD_PER_MINUTE") {
      callBridgeHandler("setTeamGoldPerMinuteEnabled", data.payload?.enabled);
    }

    if (data.type === "SHOW_TOP_GOLD_PER_MINUTE") {
      callBridgeHandler("setTopGoldPerMinuteEnabled", data.payload?.enabled);
    }

    if (data.type === "MARK_HOVERED_ALLIES_GREEN") {
      callBridgeHandler("setAllyMarkersEnabled", data.payload?.enabled);
    }

    if (data.type === "SHOW_ALLIANCE_REQUESTS_PANEL") {
      callBridgeHandler("setAllianceRequestsPanelEnabled", data.payload?.enabled);
    }

    if (data.type === "SHOW_TRADE_BALANCES") {
      callBridgeHandler("setTradeBalancesEnabled", data.payload?.enabled);
    }

    if (data.type === "SHOW_MY_GPM_HISTORY") {
      if (typeof setSelfGpmHistoryPanelPosition === "function") {
        setSelfGpmHistoryPanelPosition(data.payload?.panelPosition);
      }
      if (typeof setSelfGpmHistoryEnabled === "function") {
        setSelfGpmHistoryEnabled(data.payload?.enabled);
      } else {
        console.error(
          "OpenFront helper: self-gpm-history bridge not loaded (check manifest web_accessible_resources)",
        );
      }
    }

    if (data.type === "SHOW_NUKE_PREDICTION") {
      callBridgeHandler("setNukePredictionEnabled", data.payload?.enabled);
    }

    if (data.type === "SHOW_BOAT_PREDICTION") {
      callBridgeHandler("setBoatPredictionEnabled", data.payload?.enabled);
    }

    if (data.type === "SHOW_NUKE_SUGGESTIONS") {
      callBridgeHandler("setNukeSuggestionsEnabled", data.payload?.enabled);
    }

    if (data.type === "SET_AUTO_NUKE") {
      callBridgeHandler("setAutoNukeEnabled", data.payload?.enabled, data.payload?.includeAllies);
    }

    if (data.type === "SET_SEND_1_PERCENT_BOAT") {
      callBridgeHandler("setSend1PercentBoatEnabled", data.payload?.enabled, data.payload?.contextMenu !== false);
    }

    if (data.type === "SHOW_ECONOMY_HEATMAP") {
      callBridgeHandler("setEconomyHeatmapIntensity", data.payload?.intensity);
      callBridgeHandler("setEconomyHeatmapEnabled", data.payload?.enabled);
    }

    if (data.type === "SHOW_EXPORT_PARTNER_HEATMAP") {
      callBridgeHandler("setExportPartnerHeatmapEnabled", data.payload?.enabled);
    }


    if (data.type === "APPLY_SELECTIVE_TRADE_POLICY") {
      const requestedAt = Number(data.payload?.requestedAt);
      if (Number.isFinite(requestedAt) && requestedAt !== lastSelectiveTradePolicyRequestAt) {
        lastSelectiveTradePolicyRequestAt = requestedAt;
        callBridgeHandler("applySelectiveTradePolicy");
      }
    }

    if (data.type === "SET_SELECTIVE_TRADE_POLICY") {
      callBridgeHandler("setSelectiveTradePolicyEnabled", Boolean(data.payload?.enabled));
    }
  });

  window.setInterval(() => {
    callBridgeHandler("refreshSelectiveTradePolicyAvailability");
    callBridgeHandler("refreshCheatsAvailability");
  }, 1000);
  callBridgeHandler("refreshSelectiveTradePolicyAvailability");
  callBridgeHandler("refreshCheatsAvailability");

  window.__openfrontAutoJoinBridgeReady = true;
