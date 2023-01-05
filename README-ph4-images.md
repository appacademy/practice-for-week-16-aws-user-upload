# AWS S3 Demo, Phase 4: Images

In this final phase of the demo, you will enable users to upload multiple
private images to their account. Once again, you will need to modify both the
backend and the frontend.

## Backend

On the backend, you will need to modify the `POST` and `GET` routes for
`images`.

Open __backend/routes/api/images.js__ and load `multipleFilesUpload`,
`multipleMulterUpload`, and `retrievePrivateFile`  from __awsS3.js__:

```js
// backend/routes/api/images.js

const { multipleFilesUpload, multipleMulterUpload, retrievePrivateFile } = require("../../awsS3");
```

In the `get` route, use `retrievePrivateFile` to generate an authorized link for
each image that belongs to the specified user. Return an array of the results:

```js
// backend/routes/api/images.js

router.get(
  '/:userId',
  async (req, res) => {
    const images = await Image.findAll({where: { userId: req.params["userId"] }});
    const imageUrls = images.map(image => retrievePrivateFile(image.key));
    return res.json(imageUrls);
  }
);
```

In the `post` route, insert `multipleMulterUpload("images")` as a middleware.
Then in the callback, call `multipleFilesUpload` to upload the images to S3.
This will return an array of keys/filenames. Use that array to create all of the
images in the database. Finally, because it will be helpful on the frontend,
repeat what you did in the `get` route: use `retrievePrivateFile` to return an
array of links to the images.

Your code should look something like this:

```js
// backend/routes/api/images.js

router.post(
  '/:userId',
  multipleMulterUpload("images"),
  async (req, res) => {
    const { userId } = req.params;
    const keys = await multipleFilesUpload({ files: req.files });
    const images = await Promise.all(
      keys.map(key => Image.create({ key, userId }))
    );
    const imageUrls = images.map(image => retrievePrivateFile(image.key));
    return res.json(imageUrls);
  }
);
```

## Frontend: Getting the images to send

On the frontend, you first need to modify the `ImageUploadModal` to receive
images.

Open __frontend/src/components/ImageDisplay/ImageUploadModal.js__. Notice that
an `images` state variable has already been declared, and that `handleSubmit`
already dispatches `images` to `uploadImages`. You just need to add an `Images
to Upload` field to your form:

```js
// frontend/src/components/ImageDisplay/ImageUploadModal.js

        <label>
          Images to Upload
          <input
            type="file"
            accept=".jpg, .jpeg, .png"
            multiple
            onChange={updateFiles} />
        </label>
```

This `input` has two main differences from the avatar `input` that you created
in the previous phase. First, it includes the `multiple` attribute. Adding this
attribute is all you need to do to enable your input to accept more than one
file. Note, however, that all the files need to be selected at the same time:
each time you click `Choose Files`, it will reset the `files` field. (Selecting
multiple files at once can be done, for instance, by clicking a file and then
clicking on a second file while holding down <Shift>.)

The second difference is that this `input` limits the acceptable file types to
__.jpg__, __.jpeg__, and __.png__. Only files with these three extensions will
be selectable in the `Choose Files` dialog.

Now add an `updateFiles` function before the return to set `images`:

```js
// frontend/src/components/ImageDisplay/ImageUploadModal.js

  const updateFiles = e => {
    const files = e.target.files;
    setImages(files);
  };
```

## Frontend: Sending the images

Finally, open __frontend/src/store/images.js__ and fill in `uploadImages` to
send the images to the backend as `FormData`:

```js
export const uploadImages = (images, userId) => async dispatch => {
  const formData = new FormData();
  Array.from(images).forEach(image => formData.append("images", image));
  const response = await csrfFetch(`/api/images/${userId}`, {
    method: "POST",
    body: formData
  });
  if (response.ok) {
    const data = await response.json();
    dispatch(receiveImages(data));
  }
  return response;
};
```

Note that `images` is an array-like `FileList` rather than an actual `Array`.
(For more on the `FileList` type, see the [MDN docs][filelist].) Note, too, that
if you did not already change `csrfFetch` to leave the `Content-Type` header
blank when the body is `FormData` in Phase 3, you will need to do that now for
`uploadImages` to work.

That's it! Test your new functionality by uploading some images. You should see
them appear on your page under the `Upload Images` button.

[filelist]: https://developer.mozilla.org/en-US/docs/Web/API/FileList