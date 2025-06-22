# Google Apps Script: Archive Old Emails

![execution-log.png](https://github.com/user-attachments/assets/97f2dbbe-0277-416a-bc18-f3bc0be860ee)

A Google Apps Script to automatically apply an archive label to emails that meets all your conditions. Just deploy this script, adjust your configuration parameters, and it will automatically label your emails so that you can easily bulk delete from Gmail later on after verification.

![labels.png](https://github.com/user-attachments/assets/c3e3cb34-5cfe-4cc4-a976-87a3be5f5cd7)

This does **NOT delete** any emails. This is **intentional** so that you have a 2nd chance at reviewing all the emails before actually deleting them yourself in Gmail. 

### Supported Conditions

| Condition | Description / Value |
| --- | --- |
| Can Archive Starred | true or false |
| Can Archive Important | true or false |
| Labels to Keep | A list of Labels that are applied to emails that should never be archived. Ex: “Bills”, “My Custom Label”, “Tax” |

## Things to Try First

1. Easiest to try queries in the Gmail directly to see if that’s good enough for your use-case.
    1. Example query: `before:2023/01/01 has:attachment larger:1mb` 
    2. Issue: you can’t combine complex queries which is what led to this Apps Script being created. 
        1. Example query that doesn’t work properly: `-is:starred -is:important -label:tax -label:bill` 

## Setup

This is what will make this work with organizing your script work is that your Gmail has some sort of order. 

1. Categorize your important emails. You could do any of these options or in combination, just depends on how you want to set up your emails:
    1. Use labels such as “Bills”, “Tax”, or whichever
    2. Starring as “Starred”
    3. Marking as “Important”
    4. Use Filters on Gmail as needed to automatically assign such things for your future emails
2. (Optional, but recommended) Back up all your emails with [Google Takeout](https://takeout.google.com/settings/takeout?pli=1).

## Installation

1. Create a new project at [https://script.google.com](https://script.google.com/) 
2. Copy and paste the script
3. Add Gmail API
    1. ![add-gmail-api-service](https://github.com/user-attachments/assets/2d75fb68-c782-4510-9c34-023ba33a8ec0)
5. Customize the Config properties to however you wish! 
6. Run the script
7. (Optional) you can use the triggers to set it to run periodically since there are some limitations on how much you can use the Google Apps Script for. See more below

## Configurations

```bash
let Config = {
  // User Preferences
  "relative_date_in_months": "36",                    // Emails that are older than this number of months are candidates for archiving. Start big first
  "archive_label": "Automated/Archive",               // Label to apply if email is found as a proper candidate for deletion
  "archive_safe_label": "Automated/Archive Safe",     // Label to apply so that we don't repeat our process if an email has already been looked at
  "labels_to_keep": new Set([                         // Don't archive any emails with these labels
    "Taxes",
    "Shopping/Receipt"
  ]),
  "canArchiveStarred": false,                         // Set to false if you don't want any starred emails to be archived
  "canArchiveImportant": true,                        // Set to false if you don't want any 'important' marked emails to be archived

  // Technical settings
  "batch_size": 100,                                  // Max allowed is 100. If there are less than this amount of emails, this logic will not run. Technically, it's 500 but the size for uploading labels is 100 so that's the bottle neck. It's also about ~30 seconds per 100 emails
  "max_emails_read": 500,                             // A loose upper-limit to try to stay under the limit of Gmail read/write quota and CPU quota. 500 emails would be about 2 minutes of run time. Google may not allow us to run too much past 6 minutes according to a source and terminate the script
}
```

## Limitations

- Google has a 20k limit read/write per day to Gmail messages https://developers.google.com/apps-script/guides/services/quotas
- Google also doesn't allow the service to take up too much CPU or run for too long https://www.labnol.org/code/suspend-google-script-trigger-200424
