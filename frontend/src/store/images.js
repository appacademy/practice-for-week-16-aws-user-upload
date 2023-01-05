import { csrfFetch } from "./csrf";
import { REMOVE_USER } from "./session";

const RECEIVE_IMAGES = 'images/receiveImages';

const receiveImages = images => ({
  type: RECEIVE_IMAGES,
  images
});

export const fetchImages = id => async dispatch => {
  const response = await csrfFetch(`/api/images/${id}`);
  const data = await response.json();
  dispatch(receiveImages(data));
  return response;
};

export const uploadImages = (images, userId) => async dispatch => {
  // Your code here
};

const initialState = [];

function imagesReducer(state = initialState, action) {
  switch (action.type) {
    case RECEIVE_IMAGES:
      return [...state, ...action.images];
    case REMOVE_USER:
      return initialState;
    default:
      return state;
  }
}

export default imagesReducer;