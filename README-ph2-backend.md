# AWS S3 Demo, Phase 2: Backend

In this phase, you will set up your backend to receive a file from the frontend,
store it in S3, and save the resulting link/key to the database.

## Set up your AWS credentials in your app

You can supply your app with the AWS user credentials you created at the end of
Phase 1 through environment variables. Add the following to your
__backend/.env__ file:

```plaintext
AWS_ACCESS_KEY_ID=<Your access key id here>
AWS_SECRET_ACCESS_KEY=<Your secret access key here>
```

The `aws-sdk` package--which you will set up in a moment--will enable AWS to
grab your credentials from these environment variables. Remember that when you
deploy to Render.com or Heroku, you will need to set these environment variables
there as well.

> You can read more about how AWS uses environment variables
> [here][aws-environment-variables].

**MAKE SURE TO GITIGNORE YOUR __.ENV__ FILE.**

## Install necessary packages

To begin, `npm install` the following packages in your __backend__ folder:

- [multer]
- [aws-sdk]

## Update __app.js__

In __backend/app.js__, add the following line above `app.use(express.json())`:

```javascript
// backend/app.js

app.use(cookieParser());
app.use(express.urlencoded({ extended: false })); // <-- Add this line
app.use(express.json());
```

You can learn more about `express.urlencoded()` [here][express-urlencoded].

## Set up AWS S3

Make a file called __awsS3.js__ at the root of your __backend__ directory and
copy in the following content:

```javascript
// backend/awsS3.js

const AWS = require("aws-sdk");
const multer = require("multer");
const s3 = new AWS.S3({ apiVersion: "2006-03-01" });
const NAME_OF_BUCKET = "<NAME-OF-YOUR-BUCKET>"; // <-- Use your bucket name here

module.exports = {
  s3
};
```

**Make sure that you replace the `<NAME-OF-YOUR-BUCKET>` at the top of the
__awsS3.js__ file with the name of your bucket.**

This file will house all of your AWS-related functions. You will build it out as
you go along.

### Enable uploading of images to S3

Start by creating a function in __awsS3.js__ to upload a single file to S3:

```js
// backend/awsS3.js

const singleFileUpload = async ({ file, public = false }) => {
  const { originalname, buffer } = file;
  const path = require("path");

  // Set the name of the file in your S3 bucket to the date in ms plus the
  // extension name.
  const Key = new Date().getTime().toString() + path.extname(originalname);
  const uploadParams = {
    Bucket: NAME_OF_BUCKET,
    Key: public ? `public/${Key}` : Key,
    Body: buffer
  };
  const result = await s3.upload(uploadParams).promise();

  // Return the link if public. If private, return the name of the file in your
  // S3 bucket as the key in your database for subsequent retrieval.
  return public ? result.Location : result.Key;
};
```

Don't forget to add it to your exports:

```js
module.exports = {
  s3,
  singleFileUpload
};
```

As the name suggests, this function takes in a single file and uploads it to
your S3 bucket. A few points are worth noting:

1. The function takes in an options hash that with a `public` key that defaults
   to `false`: if you want to make something public, you must explicitly say so.

2. Every file in your bucket will need a unique name. The function takes care of
   this by turning a timestamp (plus original extension) into the name of the
   stored file:

   ```js
   const Key = new Date().getTime().toString() + path.extname(originalname);
   ```

3. If a file should be public, you need to add it to the __public__ folder. To
   add a file to the __public__ folder, you must prepend `public/` to the
   **`Key`**, not append it to the **`Bucket`** name. This will always be the
   case. You never modify the bucket name; just add any desired path to the
   key/filename and AWS will interpret it as the directory structure. (If a
   __public__ folder does not yet exist in the bucket, uploading a file
   beginning with `public/` will create it.)

   > __Note:__ There is nothing magical about naming a folder __public__. Items
   > in the __public__ folder are publicly available because of the bucket
   > policy you created in Phase 1.

4. The other point where the private/public distinction comes into play is with
   the return value. Since a public file is publicly accessible, you can simply
   return a link to its location in your S3 bucket (`result.Location`).
   Accessing private files, in contrast, will require your IAM user's AWS
   credentials, and you don't want to store those in the database. So for
   private files, you just return the key/filename (`result.Key`).

Sometimes you will want to upload more than a single file, so go ahead and add a `multipleFilesUpload` function as well:

```js
// backend/awsS3.js

const multipleFilesUpload = async ({files, public = false}) => {
  return await Promise.all(
    files.map((file) => {
      return singleFileUpload({file, public});
    })
  );
};

module.exports = {
  s3,
  singleFileUpload,
  multipleFilesUpload
};
```

### Enable retrieving of private files

As noted above, you will need the IAM user's credentials to retrieve private
files. S3 includes a helpful function, `getSignedUrl`, that will generate a link
with temporary and limited authentication built in. Write a function to return a
link authorized for getting/reading the specified object:

```js
// backend/awsS3.js

const retrievePrivateFile = (key) => {
  let fileUrl;
  if (key) {
    fileUrl = s3.getSignedUrl("getObject", {
      Bucket: NAME_OF_BUCKET,
      Key: key
    });
  }
  return fileUrl || key;
};

module.exports = {
  s3,
  singleFileUpload,
  multipleFilesUpload,
  retrievePrivateFile
};
```

(The `aws-sdk` package uses your IAM credentials in the __.env__ file to
authorize this call to `s3.getSignedUrl`.)

## Multer

Your backend now has the ability to store files in S3, but how does it get the
files in the first place? Files, which are too big to pass in a single request,
will arrive in requests with content type `multipart/form-data`.
[Multer][multer] is Node.js middleware that takes `multipart/form-data`
requests, puts the text fields into a `body` object on the request, and
reassembles the file(s) under a `file` or `files` key in the request.

### Multer setup

You can set up Multer in your __awsS3.js__ file like this:

```js
// backend/awsS3.js

const storage = multer.memoryStorage({
  destination: function (req, file, callback) {
    callback(null, "");
  },
});

const singleMulterUpload = (nameOfKey) =>
  multer({ storage: storage }).single(nameOfKey);
const multipleMulterUpload = (nameOfKey) =>
  multer({ storage: storage }).array(nameOfKey);

module.exports = {
  s3,
  singleFileUpload,
  multipleFilesUpload,
  retrievePrivateFile,
  singleMulterUpload,
  multipleMulterUpload
};
```

In `singleMulterUpload` and `multipleMulterUpload`, `nameOfKey` must match the
name under which you stored the data on the frontend. Note that Multer is strict
when processing fields: it will throw an `Unexpected Field` error if there is a
non-text field stored under a name other than what was passed as `nameOfKey`.
You can't, for instance, pass a request with both a single `image` and an array
of `images` to `singleMulterUpload("image")`; `images` will be an `Unexpected
Field`.

Now you just need to install the appropriate Multer instance on routes where you
want to receive files/images! You'll take care of that in the next two phases.

[multer]: https://www.npmjs.com/package/multer
[aws-sdk]: https://www.npmjs.com/package/aws-sdk
[express-urlencoded]: https://expressjs.com/en/4x/api.html#express.urlencoded
[aws-environment-variables]: https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-environment.html