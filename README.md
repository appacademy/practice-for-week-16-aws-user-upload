# AWS S3 Demo with PERN Stack, Phase 1: AWS

In this demo, you will create a simple app that allows users to store an avatar
and other images using the Simple Storage Service (S3) of Amazon Web Services
(AWS). This guide will show you how to add the AWS storage functionality.

The app uses the PERN stack:

- Postgres (SQLite in dev)
- Express
- React
- Node

Its basic functionality has already been built out. To see what the app
currently does, download the starter repo from the `Download Project` button at
the bottom of this page. To start your server, run the following commands in the
__backend__ folder:

```sh
cp .env.example .env
npm install
npx dotenv sequelize db:migrate
npx dotenv sequelize db:seed:all
npm start
```

In a separate terminal, `cd` into the __frontend__ folder and run `npm install
&& npm start` to start the frontend.

As you can see, the app allows you to sign up and log in. Once you have logged
in, there is an `Upload Images` button that pulls up an `Upload Images` modal.
Clicking on the modal's `Upload!` button, however, has no effect other than
closing the modal. Time to add some images!

## Phase 1: Set up AWS

This first phase describes how to set up a __public__ folder within an otherwise
private AWS bucket using bucket and user policies. If you already know how to do
this, feel free to skip to "Phase 2: Backend" in the next README.

### Create an AWS S3 bucket

Navigate to the [AWS Console]. Create an account if you haven't used AWS
yet--make sure to select the "Basic support - Free" plan when asked--or log in
if you already have an account. Once you are logged in, you should arrive at the
Amazon S3 Buckets page.

![aws-s3-buckets-page]

Click on the orange "Create bucket" button, enter a name, and choose the region
nearest you. You will run into an error if the name is already taken, so be sure
to choose a unique name. Including your initials and the name of the app that
will be using the bucket in the bucket's name can help, e.g.,
`<initials>-aws-pern-demo`.

If you want everything stored in the bucket to remain private / not accessible
by the general public, then you can leave all of the other options as their
default. If you want anything in the bucket to be publicly available, however,
then you need to **uncheck** the checkbox that says "**Block _all_ public
access**". On Twitter, e.g., posts are public, so any photos associated with
those posts also need to be publicly viewable. (Public access is recommended for
most portfolio project use cases. It is also easier to set up and use!)

For the purposes of this demonstration, you will use a _bucket policy_ to set up
a single bucket that is private except for a __public__ folder that contains
publicly accessible files. Some files will accordingly need public access,
so go ahead and **uncheck** the checkbox that says "**Block _all_ public
access**". (You'll also need to **check** the ensuing checkbox acknowledging
that the "current settings might result in this bucket and the objects within
becoming public.")

Scroll to the bottom and click "Create bucket". If your bucket was created
successfully, then you'll be taken back to the Amazon S3 Buckets page.

### Setting a bucket policy

Bucket access is controlled by _bucket policies_ and _user policies_.
(Alternatively, you can use _Access Control Lists_--known as ACLs--to regulate
permissions, but AWS now discourages the use of ACLs in most cases.) In this
section, you will create a bucket policy that grants anyone access to the
__public__ folder. In the next section, you will create an IAM user and user
policy that will allow your app to access the private areas of the bucket.

To set a bucket policy, click on the bucket you just made. On the ensuing page,
go to the "Permissions" tab.

![aws-s3-bucket-permissions]

Scroll down to the "Bucket policy" section and click "Edit". Copy and paste the
following into the "Policy" editor:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicRead",
      "Effect": "Allow",
      "Principal": "*",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": [
        "arn:aws:s3:::<YOUR BUCKET NAME>/public/*"
      ]
    }
  ]
}
```

(Don't forget to replace `<YOUR BUCKET NAME>` with the actual name of your
bucket!)

This policy effectively makes everything in the __public__ folder of your bucket
publicly accessible. The various key-value pairs have the following
significance.

The JSON object first tells AWS that the policy uses the `2012-10-17` version
policy syntax (i.e., the current version; it hasn't been updated in a while...).
The policy itself consists of a single `Statement`, although it could include
more. The `Statement` begins with an optional statement id (`Sid`) that can be
(almost) anything you want. The following four key-value pairs then effectively
`Allow`--not `Deny`--anyone (`"Principal": "*"`) to get the objects (`"Action":
[s3:GetObject]`) in the __public__ folder of this bucket (`"Resource":
["arn:aws:s3:::<YOUR BUCKET NAME>/public/*"]`).

For a good overview of policies and what they entail, see [here][policies].
Examples of bucket policies can be found [here][bucket-policy-examples].)

Click the "Save changes" button at the bottom right. If everything is correct,
you should return to your bucket page with a "Successfully edited bucket
policy." message at the top. You should now see a red bubble under your bucket
name proclaiming "Publicly accessible". The "Access" under the "Permission
overview" should also now show "Public" in red as opposed to the "Objects can be
public" message that was there before.

![aws-s3-bucket-policy-success]

### Create an IAM user

Now you are going to create a new [Identity and Access Management (IAM)][IAM]
user that your application will use to access the private areas of your bucket
and write/save to the public areas.

An IAM user is a user that you create within your account, a sort of subset of
your main account. Unlike a full root user, an IAM user will have limited access
and permissions within the account. You define those permissions through user
policies. (It is generally a good idea to create a new IAM user for each app.)  

Head to the [IAM users console][iam-users].

> If you ever want to find the IAM users console and the link is not handy, just
> search for `IAM` in the search bar and select the "IAM" service in the
> results. This will take you to the overall IAM dashboard. To get to the users
> dashboard, click "Users" under "Access management" in the left-hand side-menu.

**Tip:** If you click the "Services" link at the upper left, it will show your
recently visited areas. To make navigating the site easier, you can click the
star beside S3 and IAM to favorite them and make them always available in your
AWS toolbar.

![aws-services]
![aws-favoriting]

On the IAM users console, click the `Add users` button. Name your new user
`<your-app-name>-admin` (or something similar) and click `Next`.

Now you need to set the security policy for your new user, which controls how
they will be allowed to connect. Select `Attach policies directly` and then
`Create Policy`. This will open a new tab.

In the new browser tab, click the `JSON` tab and paste in the following, fully
replacing any sample text in the editor:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowAccess",
      "Effect": "Allow",
      "Action": ["s3:*"],
      "Resource": "arn:aws:s3:::<YOUR BUCKET NAME>/*"
    }
  ]
}
```

Make sure to replace `<YOUR BUCKET NAME>` with the name of your bucket. **The
bucket name must exactly match the name of the bucket you created earlier.**

This JSON object first tells AWS that the policy uses the `2012-10-17` version
policy syntax. (As noted above, this is the current policy syntax version.) The
policy itself again consists of a single `Statement` object. The `Statement`
begins with an optional statement id (`Sid`) that can be (almost) anything you
want. The following three key-value pairs then effectively `Allow`--not
`Deny`--all actions (`"Action": ["s3:*"]`) in the listed bucket (`"Resource":
"arn:aws:s3:::<YOUR BUCKET NAME>/*"`).

When you have entered your policy, click `Next: Tags` and then `Next: Review`.
Give the policy whatever name you like (e.g., `s3-access-to-<name-of-project>`).
Click `Create policy` and head back to the other tab where you are creating a
new IAM user.

Click the refresh button to the left of the `Create Policy` button, then search
for the policy that you just created. Check that policy, then click `Next`. On
the next page, click `Create user`. This should return you to the users index
with a green "User created successfully" banner.

Click `View user` in the banner or the name of the user you just created in the
`Users` list. On the user's show page, go to the `Security credentials` tab.
Scroll down to `Access keys` and click `Create access key`. On the ensuing `best
practices` page, select `Application running outside AWS` or `Other`--it doesn't
matter which one you choose--and click `Next`. You can skip setting more tags
and just click to `Create access key`.

On the next page, you will see the new user's `Access Key ID` and `Secret Access
Key`. These are the user's security credentials, and they will never be
accessible again once you leave this page. (If you do leave the page before
securing the credentials, you will need to delete the key and create a new one.)
You will use these two values at the beginning of the next phase when you start
to set up your backend, so keep them handy.

Click to download the __.csv__ file. Store this somewhere safe on your computer.
**NEVER PUSH THIS FILE (OR ITS CONTENTS) TO GITHUB OR POST IT ANYWHERE PUBLIC!**

Now on to Phase 2: Setting up the backend!

[AWS Console]: https://s3.console.aws.amazon.com/s3/home
[policies]: https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-policy-language-overview.html
[IAM]: https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html
[iam-users]: https://console.aws.amazon.com/iam/home?#/users
[aws-services]: https://appacademy-open-assets.s3.us-west-1.amazonaws.com/Modular-Curriculum/content/week-16/aws-services.png
[aws-favoriting]: https://appacademy-open-assets.s3.us-west-1.amazonaws.com/Modular-Curriculum/content/week-16/aws-favoriting.png
[aws-s3-buckets-page]: https://appacademy-open-assets.s3.us-west-1.amazonaws.com/Modular-Curriculum/content/week-16/aws-s3-buckets-page.png
[aws-s3-bucket-permissions]: https://appacademy-open-assets.s3.us-west-1.amazonaws.com/Modular-Curriculum/content/week-16/aws-s3-bucket-permissions.png
[aws-s3-bucket-policy-success]: https://appacademy-open-assets.s3.us-west-1.amazonaws.com/Modular-Curriculum/content/week-16/aws-s3-bucket-policy-success.png
[bucket-policy-examples]: https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies.html