# Audipo Marks manager

![npm](https://img.shields.io/npm/v/audipomarks)

`audipomarks` is an [Audipo](#audipo) player [marks](#marks) manager, that allows you to:

- split the all-marks file exported by Audipo player into smaller chunks and distribute them among the directories they refer to;

- recursively join multiple directory-level marks files into the all-marks one, that you can then import back into Audipo;

- generate marks automatically using **FFmpeg** [silencedetect](https://ffmpeg.org/ffmpeg-filters.html#silencedetect) filter.

## Usage

### TL;DR

Install:

```
$ npm i -g audipomarks
```

Split:

```
audipomarks split --root=MyMedia exported.audipomark
```

Join:

```
audipomarks join .
```

Generate marks:

```
audipomarks mark -r .
```

### Prerequisites

#### Required software

`audipomarks` is written on JavaScript, and so you need to install [Node.js 16.x](https://nodejs.org/en/) and [npm 8.x](https://www.npmjs.com/package/npm).

> 💡 I recommend using [`nvm`](https://github.com/nvm-sh/nvm) for getting both node and npm. It also lets you to install packages globally (`npm i -g ...`) w/o administrator priviledges.


#### Media arrangement

Let's assume you have a folder with your media files somewhere on your phone, and also have it copied to your PC.

> 💡 Ideally you'd want to have this folder synced with your PC automatically, using tools like FolderSync or AutoSync. They do a really good job at syncing folders with cloud drives — Google Drive, Dropbox, Yandex.Disk etc

To be specific, let's imagine that you keep your media files at `MyMedia/` on your phone:

```
/storage/emulated/0/MyMedia
```

and have it already copied to your PC at:

```
/home/me/MyMedia
```

> 💡 With FolderSync, you just add a folder-level rule, and get those two directories in sync all the time.

We'll refer this setup below.

### Install

**Global installation (recommended)**

```
$ npm i -g audipomarks
```

Now you can run it from anywhere w/o any prefixes or paths, e.g.:

```
$ audipomarks <params>
```

**Local installation (not recommended)**

<details>
  <summary>Expand...</summary>

```
$ npm i audipomarks
```

Now you run `audipomarks` from the current directory as:

```
$ node_modules/.bin/audipomarks <params>
```

or with [`npx`](https://www.npmjs.com/package/npx) (part of `npm`):

```
$ npx audipomarks <params>
```

</details>

### Exporting marks data

Open the Audipo app, go to **Preferences**, tap **Export all marks data**, then **Audipo marks format** on the next screen and finally tap **Share** to save the marks file somewhere, from where you can easily transfer it to your PC.

![](doc/export.png)

The filename will look like `exportedmarks20220706_020654.audipomark`.

Going back to our example, let's assume that you saved the file in `MyMedia/` on your phone, and then copied it to `/home/me/MyMedia/` on PC.

> 💡 With FolderSync, you'd have it copied automatically.

So now you should have your media files along with the exported all-marks file in your `/home/me/MyMedia/`:

```
/home/
  me/
    MyMedia/
      exportedmarks20220706_020654.audipomark
      Lessons/
        Lesson1.mp3
        Lesson2.mp3
        MoreLessons/
          NewLesson1.mp3
          NewLesson2.mp3
      Songs/
        ...
```

## The `split` command

Now that you have your all-marks data file in place on your PC, you're ready to disassemble it through directories with the actual audio files:

```
$ audipomarks split --root=MyMedia /home/me/MyMedia/exportedmarks20220706_020654.audipomark
```

The required `--root` parameter specifies the location of the user media directory (`MyMedia/`) **on your phone**.
It can use either absolute or relative path:

- **absolute**, e.g.: `/storage/emulated/0/MyMedia` or
- **relative**, i.e.: `MyMedia`

The `split` command will:

- parse the all-marks file,
- check all the directories and files from it,
- split the data by smaller marks files
- and save them under the `local.audipomark` name in the directories they refer to.

There is also an optional `--normalize` `(-n)` flag, which forces `audipomarks` to
filter discovered marks. Basically, it removes all the marks which are too close to
each other. The hard-coded proximity value now is 1 second (1000ms). When generating marks with `mark` command (see below), normalization is performed automatically.

So your should end up with 3 new files:

```
/home/
  me/
    MyMedia/
      exportedmarks20220706_020654.audipomark
      Lessons/
        local.audipomark
        Lesson1.mp3
        Lesson2.mp3
        MoreLessons/
          local.audipomark
          NewLesson1.mp3
          NewLesson2.mp3
      Songs/
        local.audipomark
        ...
```

## Working with directory-level marks files

Each `local.audipomark` file references only files from the directory it's saved into.

For example, the first `local.audipomark` from above will keep marks from `Lesson1.mp3` and `Lesson2.mp3` but not from `MoreLessons/` subdirectory.

Also, `local.audipomark` files don't keep their original (phone) locations and hence their containing directories can now be relocated according to your preferences.

Things you may want to do with now "disassebmled" marks file:

- Rename directories
- Move directories to new locations within your media directory
- Generate marks using tools like [audio-silence-marks](https://pypi.org/project/audio-silence-marks/)

## The `join` command

After you're finished with refactoring locations of your media or with updating marks files, you're now ready to build the all-marks file and import it back into Audipo.

```
$ audipomarks join /home/me/MyMedia
```

This command will:

- find all `local.audipomark` files below `/home/me/MyMedia`,
- join them back into one solid marks file
- and save it to `/home/me/MyMedia/global.audipomark`.

You can now import it back into Audipo:

1. Transfer the `global.audipomark` file to your phone.

> 💡 With FolderSync, you'd have it in place automatically.

2. Delete the old marks data: **Preferences > Delete all mark data**
3. Import the new all-marks file: **Preferences > Import mark data**

You're done, congratulations!

## The `mark` command

Now that the functionality of [audio-silence-marks](https://pypi.org/project/audio-silence-marks/) has been ported into this tool, you can
generate marks automatically for a directory or even a directory tree.

```
$ audipomarks mark /home/me/MyMedia/Lessons
```

This command will run FFmpeg [silencedetect](https://ffmpeg.org/ffmpeg-filters.html#silencedetect) filter against every file in that dir (only) and
will generate `local.audipomark` file with the list of autodetected marks.

If you want it to operate recursively use `--recursive` `(-r)` flag:

```
$ audipomarks mark -r /home/me/MyMedia
```

The **silencedetect** filter takes two paramteres: `noise` and `duration`.
The default values `audipomarks` uses are:

`noise` = `50` (dB)<br/>
`duration` = `1000` (ms)

There is no way, however, to pass them via the command line options.

Instead, you should create a special file named **.audiomarks** in every directory you want to apply those parameters for:

```json
{
  "ffmpeg": {
    "duration": 800,
    "noise": 40
  }
}
```

It will come in handy later, if/when you discover that your last generation doesn't satisfy you.

It should be noted, that FFmpeg **silencedetect** filter may return intervals
which are kind of too close to each other. For this reason, `audipomarks` filters out marks which are _too close_ to the previous ones. The hardcoded thrashold is 1 second (1000ms).

## TODO

- [x] Bring functionality from [audio-silence-marks](https://pypi.org/project/audio-silence-marks/) into this tool, but preserving the directory-scoped marks file paradigm (`audio-silence-marks` ends up with just one file for a subtree)

## Audipo and marks

### Audipo

[Music Speed Changer: Audipo](https://play.google.com/store/apps/details?id=jp.ne.sakura.ccice.audipo&hl=en&gl=US) is an audio player for Android.

It's a swiss-knife for tasks like:

- learning foreign languages;
- transcribing interviews and other audio recordings;
- learning poems and songs.

It features:

- Nice support for Bluetooth remote control devices.
- Setting playback stop points, called **marks**.
- Changing the pitch (to match your own vocal range).
- Changing the playback speed (this one is regular, but still...).

And many more.

### Marks

Marks are basically a list of timecodes. They are usually used as stop points for the player to allow for A-B repetition or for fast and precise navigation through an audio recording.

In Audipo player you create marks by tapping the <img src="doc/audipo-add-mark-button.png" width="30" style="vertical-align: bottom"/> button.

You can also open the mark list in a separate window and fine-adjust any mark with the precision of hundredths of a second.

![Audipo marks](doc/marks.png)
