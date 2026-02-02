delete window.$;
let wpRequire = webpackChunkdiscord_app.push([[Symbol()], {}, (r) => r]);
webpackChunkdiscord_app.pop();

const findModule = (filter) => {
  for (const i in wpRequire.c) {
    const m = wpRequire.c[i].exports;
    if (!m) continue;
    const targets = [m.Z, m.ZP, m.default, m.Ay, m.Bo, m.tn, m.A, m].filter(
      (t) => t && typeof t === "object",
    );
    for (const t of targets) {
      try {
        if (filter(t)) return t;
      } catch (e) {}
    }
  }
};

const ApplicationStreamingStore = findModule(
  (m) => m.getStreamerActiveStreamMetadata,
);
const RunningGameStore = findModule((m) => m.getRunningGames);
const QuestsStore = findModule((m) => m.getQuest && (m.quests || m.getQuests));
const ChannelStore = findModule(
  (m) => m.getSortedPrivateChannels || m.getAllThreadsForParent,
);
const GuildChannelStore = findModule((m) => m.getSFWDefaultChannel);
const FluxDispatcher = findModule((m) => m.flushWaitQueue);
const api = findModule((m) => m.get && m.post && m.put);

const supportedTasks = [
  "WATCH_VIDEO",
  "PLAY_ON_DESKTOP",
  "STREAM_ON_DESKTOP",
  "PLAY_ACTIVITY",
  "WATCH_VIDEO_ON_MOBILE",
];

const rawQuests = QuestsStore?.getQuests
  ? QuestsStore.getQuests()
  : QuestsStore?.quests;
let quests = (
  rawQuests instanceof Map
    ? Array.from(rawQuests.values())
    : Object.values(rawQuests || {})
).filter(
  (x) =>
    x.userStatus?.enrolledAt &&
    !x.userStatus?.completedAt &&
    new Date(x.config.expiresAt).getTime() > Date.now(),
);

let isApp = typeof DiscordNative !== "undefined";

if (!quests || quests.length === 0) {
  console.log(
    "❌ No active quests found. Make sure you have clicked 'Accept' in the Quest menu!",
  );
} else {
  let doJob = function () {
    const quest = quests.pop();
    if (!quest) return;

    const pid = Math.floor(Math.random() * 30000) + 1000;
    const applicationId = quest.config.application.id;
    const questName = quest.config.messages.questName;
    const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
    const taskName = supportedTasks.find((x) => taskConfig.tasks[x] != null);
    const secondsNeeded = taskConfig.tasks[taskName].target;
    let secondsDone = quest.userStatus?.progress?.[taskName]?.value ?? 0;

    console.log(`🎯 Running Quest: ${questName} (${taskName})`);

    if (taskName.includes("WATCH_VIDEO")) {
      let fn = async () => {
        while (secondsDone < secondsNeeded) {
          secondsDone += 7; // Speed-up
          const res = await api.post({
            url: `/quests/${quest.id}/video-progress`,
            body: {
              timestamp: Math.min(secondsNeeded, secondsDone + Math.random()),
            },
          });
          console.log(
            `📈 [${questName}] Progress: ${Math.min(secondsDone, secondsNeeded)}/${secondsNeeded}`,
          );
          if (res.body.completed_at) break;
          await new Promise((r) => setTimeout(r, 1500));
        }
        console.log(`✅ ${questName} Done!`);
        doJob();
      };
      fn();
    } else if (taskName === "PLAY_ON_DESKTOP" && isApp) {
      api
        .get({ url: `/applications/public?application_ids=${applicationId}` })
        .then((res) => {
          const appData = res.body[0];
          const exeName = appData.executables
            .find((x) => x.os === "win32")
            .name.replace(">", "");
          const fakeGame = {
            id: applicationId,
            name: appData.name,
            pid: pid,
            pidPath: [pid],
            start: Date.now(),
            exeName,
            exePath: `c:/program files/${appData.name.toLowerCase()}/${exeName}`,
          };
          const realGetGames = RunningGameStore.getRunningGames;
          RunningGameStore.getRunningGames = () => [fakeGame];
          FluxDispatcher.dispatch({
            type: "RUNNING_GAMES_CHANGE",
            removed: [],
            added: [fakeGame],
            games: [fakeGame],
          });

          let checkProgress = (data) => {
            let progress = Math.floor(data.userStatus.progress[taskName].value);
            console.log(
              `🎮 [${questName}] Progress: ${progress}/${secondsNeeded}`,
            );
            if (progress >= secondsNeeded) {
              RunningGameStore.getRunningGames = realGetGames;
              FluxDispatcher.unsubscribe(
                "QUESTS_SEND_HEARTBEAT_SUCCESS",
                checkProgress,
              );
              console.log(`✅ ${questName} Done!`);
              doJob();
            }
          };
          FluxDispatcher.subscribe(
            "QUESTS_SEND_HEARTBEAT_SUCCESS",
            checkProgress,
          );
        });
    }
  };
  doJob();
}
