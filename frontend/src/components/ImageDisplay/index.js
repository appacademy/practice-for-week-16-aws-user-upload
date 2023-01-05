import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchImages } from "../../store/images";
import OpenModalButton from "../OpenModalButton";
import ImageUploadModal from "./ImageUploadModal";
import "./ImageDisplay.css";

function ImageDisplay() {
  const dispatch = useDispatch();
  const sessionUser = useSelector(state => state.session.user);
  const imageUrls = useSelector(state => state.images);

  useEffect(() => {
    if (!sessionUser) return;
    dispatch(fetchImages(sessionUser.id));
  }, [dispatch, sessionUser]);
  
  if (!sessionUser) return null;

  const display = imageUrls?.map(imageUrl => {
    return <img className="image" key={imageUrl} src={imageUrl} alt="" />
  });

  return (
    <div className="image-display">
      <h1> {`${sessionUser.username}'s Images`} </h1>
      <OpenModalButton
        buttonText="Upload Images"
        modalComponent={<ImageUploadModal userId={sessionUser.id} />}
      />
      <div className="images">
        {display}
      </div>
    </div>
  );
}

export default ImageDisplay;
