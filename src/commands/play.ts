// import which from "which";
// import createVlc from "@richienb/vlc";

// export default async function (file: string) {
//   try {
//     const { default: createVlc } = await import("@richienb/vlc");
//     const vlc = await createVlc();
//   } catch (e) {
//     log(e);
//   }
// }
//   const a = vlc;

// discoverVlc();

// // Play audio
// await vlc.command("in_play", {
//   input: file,
// });
// log("Here after in_play");
// // Pause/resume audio
// // await vlc.command('pl_pause');У
// }

// function discoverVlc() {
//   const resolved = which.sync("vlc", { nothrow: true });
//   if (resolved) {
//     return;
//   }
// }
