/**
 * Archive any emails found that satisfies the conditions in the Config below.
 * By default, this does NOT delete any emails but helps gather those that are candidates for deletion and add a label to them so that you can review the emails marked before deleting them yourself later.
 * You can turn on "move_to_trash" as true in order to delete them.
 * 
 * Google has a 20k limit read/write per day to Gmail messages https://developers.google.com/apps-script/guides/services/quotas
 * Google also doesn't allow the service to take up too much CPU or run for too long https://www.labnol.org/code/suspend-google-script-trigger-200424 
 */

//////////// Configs ////////////

let Config = {
  // User Preferences
  "relative_date_in_months": "36",                    // Emails that are older than this number of months are candidates for archiving. Start big first
  "archive_label": "Automated/Archive",               // Label to apply if email is found as a proper candidate for deletion
  "archive_safe_label": "Automated/Archive Safe",     // Label to apply so that we don't repeat our process if an email has already been looked at
  "labels_to_keep": new Set([                         // Don't archive any emails with these labels
    "Taxes",
    "Shopping/Receipt"
  ]),
  "can_archive_starred": false,                       // Set to false if you don't want any starred emails to be archived
  "can_archive_important": true,                      // Set to false if you don't want any 'important' marked emails to be archived
  "move_to_trash": true,                              // Set to false if you don't want to automatically send archivable emails to trash. Can make app script slower
  "mark_archiving_as_unimportant": true,              // Set to false if you don't want to mark deleting emails as not important. Can make app script slower

  // Technical settings
  "batch_size": 100,                                  // Max allowed is 100. If there are less than this amount of emails, this logic will not run. Technically, it's 500 but the size for uploading labels is 100 so that's the bottle neck. It's also about ~30 seconds per 100 emails
  "max_emails_read": 300,                             // A loose upper-limit to try to stay under the limit of Gmail read/write quota and CPU quota. 500 emails would be about 5 minutes of run time. Google may not allow us to run too much past 6 minutes according to a source and terminate the script so try to keep below that too
}

/*
 * Set variables in the `start()` method 
 */
let GlobalVars = {}

//////////// Start ////////////

function start() {
  setupGlobalVars()
  let readCount = 0
  while (readCount < Config.max_emails_read) {
    const emails = getEmails()

    if (emails.length == 0) {
      console.log(`No emails to process!`)
      break
    }

    console.log(`Got ${emails.length} emails`)
    const threadsToArchive = []
    const threadsArchiveSafe = []

    for (const email of emails) {
      determineEmailArchivable(
        email,
        { check: !Config.can_archive_important && email.isImportant, reason: "Important" },
        { check: !Config.can_archive_starred && email.isStarred, reason: "Starred" },
        { check: email.labels.find(label => Config.labels_to_keep.has(label)) !== undefined, reason: "Keep Label" }
      )
      email.shouldArchive ? threadsToArchive.push(email.originalThread) : 
                            threadsArchiveSafe.push(email.originalThread)
    }

    GlobalVars.archiveSafeLabel.addToThreads(threadsArchiveSafe)
    
    if (Config.move_to_trash) {
      GmailApp.moveThreadsToTrash(threadsToArchive)
    } else {
      GlobalVars.archiveLabel.addToThreads(threadsToArchive)
    }

    if (Config.mark_archiving_as_unimportant) {
      console.log(`Marking archiving emails as unimportant`)
      GmailApp.markThreadsUnimportant(threadsToArchive)
    }
    readCount += emails.length
  }
}

/*
 * Must call this in the beginning of "start" method, otherwise some variables will not have been loaded
 */
function setupGlobalVars() {
  GlobalVars.archiveLabel = getOrCreateLabel(Config.archive_label)
  GlobalVars.archiveSafeLabel = getOrCreateLabel(Config.archive_safe_label)
}

function determineEmailArchivable(email, ...conditions) {
  email.shouldArchive = true
  for (const condition of conditions) {
    if (condition.check) {
      console.log(`Will not archive '${email.subject}', due to: '${condition.reason}'`)
      email.shouldArchive = false
      break
    }
  }

  if (email.shouldArchive) {
    console.log(`Will ${Config.move_to_trash ? "trash" : "archive"} '${email.subject}'`)
  }
}

//////////// Gmail ////////////

function getEmails() {
  try {
    const query = `older_than:${Config.relative_date_in_months}m -label:${Config.archive_label} -label:${Config.archive_safe_label}`
    const threads = GmailApp.search(query, 0, Config.batch_size)
    return parseEmailThreads(threads)
  } catch (exception) {
    console.warn(`Failed to getEmails: ${exception}`)
    return []
  }
}

function parseEmailThreads(threads) {
  const emails = []
  for (const thread of threads) {
    emails.push({
      subject: thread.getFirstMessageSubject(),
      isStarred: thread.hasStarredMessages(),
      isImportant: thread.isImportant(),
      labels: getLabelsFromThread(thread),
      date: thread.getLastMessageDate(),
      originalThread: thread
    })
  }
  return emails
}

function getLabelsFromThread(thread) {
  const labels = []
  for (const labelObject of thread.getLabels()) {
    labels.push(labelObject.getName())
  }
  return labels
}

function getOrCreateLabel(label) {
  return GmailApp.getUserLabelByName(label) || GmailApp.createLabel(label);
}

function applyLabelToEmail(label, emails) {
  for (const email of emails) {
    email.originalThread.addLabel(label)
  }
}
