# AWS S3 Demo, Phase 3: Avatar

Now that your backend is set up to receive images/files, let's give your users
the chance to upload an avatar image when they sign up! This will require you to
modify both the backend and the frontend.

## Backend

First, enable your backend to receive a (single) profile image when a user signs
up. (Note that your `User` model already has an optional `profileImageUrl` field
ready to use!)

### Public or private?

Before implementing this feature, you need to decide whether you want the
profile image to be _public_ or _private_. Since users presumably want other
users to see their avatars, the avatar image should be public, i.e., you want to
store it in the __public__ folder of your S3 bucket. The bucket policy that you
created in Phase 1 will then allow anyone with the link to read it.
(**Remember:** Public upload is recommended for most portfolio project use
cases.)

### Editing your route

For this use case, you want to modify the sign-up route, so open
__backend/routes/api/users.js__. You first need to import the appropriate
functions from __awsS3.js__ at the top of the file. Since this feature requires
only a single image file, import `singleFileUpload` and `singleMulterUpload`:

```js
// backend/routes/api/users.js

const { singleFileUpload, singleMulterUpload } = require("../../awsS3");
```

Next, install `singleMulterUpload` as middleware on the sign-up route. It should
look for a key of `image`:

```js
// backend/routes/api/users.js

router.post(
  '',
  singleMulterUpload("image"), // <-- Add this line
  validateSignup,
  // ...
```

Finally, the route currently just sets the optional `profileImageUrl` to `null`.
Change this so that, if the request has an image attached, the route will upload
that image to S3 and store the resulting link to it in the database under
`profileImageUrl`. Your route should now look something like this:

```js
// backend/routes/api/users.js

router.post(
  '',
  singleMulterUpload("image"),
  validateSignup,
  async (req, res) => {
    const { password, username } = req.body;
    const profileImageUrl = req.file ? 
      await singleFileUpload({ file: req.file, public: true }) :
      null;
    const user = await User.signup({ 
      username,
      password,
      profileImageUrl
    });

    await setTokenCookie(res, user);

    return res.json({
      user
    });
  }
);
```

That's it for the backend!

## Frontend: Getting an image file

On the frontend, you first need to modify your `SignupFormModal` to take in an
avatar image as well as a username and password. Begin by declaring a state
variable `image` inside `SignupFormModal`:

```js
// frontend/src/components/SignupFormModal/index.js

function SignupFormModal() {
  // ...
  const [image, setImage] = useState(null);
  // ...
}
```

Then add `image` to the object that you pass to `signup` in `handleSubmit`:

```js
// frontend/src/components/SignupFormModal/index.js

  const handleSubmit = e => {
    // ...
      return dispatch(sessionActions.signup({ username, password, image }))
    // ...
```

Next, add an `Avatar` input in the returned JSX, right above the submit button.
Specify the `type` as `"file"`:

```js
// frontend/src/components/SignupFormModal/index.js

        {/* ... */}
        <label>
          Avatar
          <input type="file" onChange={updateFile} />
        </label>
        <button type="submit">Sign Up</button>
```

Finally, go back up before the `return` statement and add the `updateFile`
function:

```js
// frontend/src/components/SignupFormModal/index.js

  const updateFile = e => {
    const file = e.target.files[0];
    if (file) setImage(file);
  };
```

File inputs are stored in the input object under `files`. Since the `Avatar`
input only allows for a single file upload--you will see how to allow multiple
files in a bit--the desired file will always be found at `files[0]`.

## Frontend: Sending an image file

Now that you have the file, you need to send it to the backend so it can be
stored with your user's other information. Recall that in the previous section
you modified the call to `signup` in `SignupFormModal` to include `image`. In
this section, you will modify `signup` (and `csrfFetch`) so that they can
process that `image` appropriately.

Open __frontend/src/store/session.js__ and find the `signup` thunk action
creator. Unfortunately, you cannot send files to your backend using simple JSON;
they are just too big. You will accordingly need to send them as [FormData]
instead. Fortunately, `FormData` is rather straightforward to configure. You
simply create a new `FormData` instance and `append` whatever fields you need.
Replace the entire contents of `signup` with the following code:

```js
// frontend/src/store/session.js

export const signup = user => async dispatch => {
  const { image, username, password } = user;
  const formData = new FormData();
  formData.append("username", username);
  formData.append("password", password);

  if (image) formData.append("image", image);

  const response = await csrfFetch("/api/users", {
    method: "POST",
    body: formData
  });

  const data = await response.json();
  dispatch(setUser(data.user));
  return response;
};
```

Note that you only want to append `image` if there is an image to append.

For this version of `signup` to work, you need to make one more change.
`FormData` uses the `multipart/form-data` encoding, but you cannot set the
`Content-Type` header to `multipart/form-data` manually because it needs to
contain information about the multi-part boundaries. Fortunately, this gets
handled automatically as long as the `Content-Type` header remains empty. You
just have to make sure that your `csrfFetch` function doesn't explicitly set
that header if the body is of type `FormData`.

Go to __frontend/src/store/csrf.js__. Inside `csrfFetch`, change this line

```js
// frontend/src/store/csrf.js
  options.headers["Content-Type"] =
    options.headers["Content-Type"] || "application/json";
```

to this:

```js
// frontend/src/store/csrf.js
  if (!options.headers["Content-Type"] && !(options.body instanceof FormData)) {
    options.headers["Content-Type"] = "application/json";
  }
```

Your app is now ready to send a user's avatar image file to the backend for
storage! Try it out by signing up as a new user and selecting an image file for
your avatar. Once you are signed in, that image should appear on the profile
button!

> **Note:** `ProfileButton` is already set up to display a user's profile image
> if the user has a `profileImageUrl`. See
> __frontend/src/components/Navigation/ProfileButton.js__ for code.

In the final phase, you will enable users to upload images.

[FormData]: https://developer.mozilla.org/en-US/docs/Web/API/FormData