# 🎮 Menyelesaikan Misi Game Discord Tanpa Bermain

> 🇬🇧 Want the English version? [Click here](./README.md)

## ⚠️ PERINGATAN

Metode ini **tidak disarankan untuk akun utama Anda**. Modifikasi terhadap klien Discord dapat melanggar [Ketentuan Layanan Discord](https://discord.com/terms). Gunakan dengan risiko Anda sendiri.

---

## 🧩 Langkah 1: Aktifkan Mode Developer di Discord

### Windows

1. **Tutup Discord sepenuhnya** (Klik kanan di taskbar > Quit Discord).

<img src="./assets/close-discord.webp" alt="screenshot close discord" width="300" style="margin-bottom: 16px; margin-left: 20px;"/>

2. Tekan `Windows + R`, ketik: `%appdata%\discord`

<img src="./assets/windows-run.webp" alt="screenshot windows run" width="300" style="margin-bottom: 16px; margin-left: 20px;"/>

3. Buat cadangan `settings.json` → Ubah namanya jadi `settings_old.json`

<img src="./assets/settings.webp" alt="screenshot settings" width="400" style="margin-bottom: 16px; margin-left: 20px;"/>

4. Ganti isi `settings.json` dengan:

#### Script Settings

```json
{
  "IS_MAXIMIZED": true,
  "IS_MINIMIZED": false,
  "WINDOW_BOUNDS": {
    "x": 112,
    "y": 60,
    "width": 1284,
    "height": 724
  },
  "DANGEROUS_ENABLE_DEVTOOLS_ONLY_ENABLE_IF_YOU_KNOW_WHAT_YOURE_DOING": true,
  "MIN_WIDTH": 940,
  "MIN_HEIGHT": 500,
  "chromiumSwitches": {}
}
```

### macOS

> ⚠️ Catatan: Saya tidak punya perangkat Mac, jadi tidak ada tangkapan layar di bagian ini.  
> Tapi kamu tetap bisa mengikuti langkah-langkah di bawah ini karena sudah dijelaskan dengan jelas.

1. Tutup Discord.

2. Buka Finder > Go > "Go to Folder" `(Shift + Cmd + G)`

3. Masukkan: `~/Library/Application Support/discord`

4. Backup dan ubah nama `settings.json` menjadi `settings_old.json`

5. Ganti isi file `settings.json` [seperti di atas](#script-settings).

---

## 🧪 Langkah 2: Selesaikan Misi Tanpa Main

1. Buka tab **Quests** di Discord dan **pilih misi apa saja**.

2. Pastikan untuk memilih **"Quest on Desktop"**, bukan versi console.

<img src="./assets/quest-on-desktop.webp" alt="screenshot quest on desktop" width="300" style="margin-bottom: 16px; margin-left: 20px;"/>

3. Buka Developer Tools di **aplikasi Discord desktop yang terinstall** (bukan Discord Web):

   - Windows: `Ctrl + Shift + I`

   - macOS: `Cmd + Option + I`

   > ⚠️ Pastikan kamu menggunakan aplikasi Discord desktop. Cara ini **tidak akan bekerja** di versi web.

    <img src="./assets/developer-tools.webp" alt="screenshot developer tools" width="300" style="margin-bottom: 16px; margin-left: 20px;"/>

4. Pilih tab **Console**, aktifkan `Verbose`.

<img src="./assets/verbose.webp" alt="screenshot verbose" width="300" style="margin-bottom: 16px; margin-left: 20px;"/>

5. Tempel [kode](./script.js) berikut:

```js
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
    console.log("❌ Tidak ada quest aktif yang sudah di-Accept. Buka menu Quests dan klik Accept dulu!");
} else {
    let doJob = function() {
        const quest = quests.pop();
        if (!quest) return;

        const pid = Math.floor(Math.random() * 30000) + 1000;
        const applicationId = quest.config.application.id;
        const questName = quest.config.messages.questName;
        const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
        const taskName = supportedTasks.find(x => taskConfig.tasks[x] != null);
        const secondsNeeded = taskConfig.tasks[taskName].target;
        let secondsDone = quest.userStatus?.progress?.[taskName]?.value ?? 0;

        console.log(`🎯 Menjalankan Quest: ${questName} (${taskName})`);

        if (taskName.includes("WATCH_VIDEO")) {
            let fn = async () => {
                while (secondsDone < secondsNeeded) {
                    secondsDone += 7; // Speed-up
                    const res = await api.post({
                        url: `/quests/${quest.id}/video-progress`,
                        body: { timestamp: Math.min(secondsNeeded, secondsDone + Math.random()) }
                    });
                    console.log(`📈 [${questName}] Progress: ${Math.min(secondsDone, secondsNeeded)}/${secondsNeeded}`);
                    if (res.body.completed_at) break;
                    await new Promise(r => setTimeout(r, 1500));
                }
                console.log(`✅ ${questName} Selesai!`);
                doJob();
            };
            fn();
        } else if (taskName === "PLAY_ON_DESKTOP" && isApp) {
            api.get({ url: `/applications/public?application_ids=${applicationId}` }).then(res => {
                const appData = res.body[0];
                const exeName = appData.executables.find(x => x.os === "win32").name.replace(">", "");
                const fakeGame = {
                    id: applicationId, name: appData.name, pid: pid, pidPath: [pid], start: Date.now(),
                    exeName, exePath: `c:/program files/${appData.name.toLowerCase()}/${exeName}`
                };
                const realGetGames = RunningGameStore.getRunningGames;
                RunningGameStore.getRunningGames = () => [fakeGame];
                FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: [], added: [fakeGame], games: [fakeGame] });
                
                let checkProgress = (data) => {
                    let progress = Math.floor(data.userStatus.progress[taskName].value);
                    console.log(`🎮 [${questName}] Progress: ${progress}/${secondsNeeded}`);
                    if (progress >= secondsNeeded) {
                        RunningGameStore.getRunningGames = realGetGames;
                        FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", checkProgress);
                        console.log(`✅ ${questName} Selesai!`);
                        doJob();
                    }
                };
                FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", checkProgress);
            });
        }
    };
    doJob();
}
```

5. Diamkan hingga durasi misi selesai (misalnya **900 detik**).

<img src="./assets/quest-time.webp" alt="screenshot quest time" width="300" style="margin-bottom: 16px; margin-left: 20px;"/>

6. Klik **Claim Reward** setelah tombolnya aktif.

<img src="./assets/claim.webp" alt="screenshot claim" width="300" style="margin-bottom: 16px; margin-left: 20px;"/>

---

## 📜 Disclaimer

> ⚠️ Repositori ini hanya untuk tujuan edukasi. Penulis tidak bertanggung jawab atas ban akun, kehilangan data, atau efek lain yang mungkin timbul dari penggunaan metode ini.
