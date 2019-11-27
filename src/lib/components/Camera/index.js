import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';

// for debugging with git cloned jslib-html5-camera-photo
// clone jslib-html5-camera-photo inside /src and replace
// from 'jslib-html5-camera-photo' -> from '../../../jslib-html5-camera-photo/src/lib';
import LibCameraPhoto, { FACING_MODES, IMAGE_TYPES } from 'jslib-html5-camera-photo';

import CircleButton from '../CircleButton';
import WhiteFlash from '../WhiteFlash';
import DisplayError from '../DisplayError';

import {getShowHideStyle,
  getVideoStyles,
  isDynamicPropsUpdate,
  playClickAudio,
  printCameraInfo} from './helpers';
import './styles/camera.css';

/*
Inspiration : https://www.html5rocks.com/en/tutorials/getusermedia/intro/
*/

let libCameraPhoto = null;
let showVideoTimeoutId = null;

function Camera(props) {

  const [dataUri, setDataUri] = useState('');
  const [isShowVideo, setIsShowVideo] = useState(true);
  const [isCameraStarted, setIsCameraStarted] = useState(false);
  const [startCameraErrorMsg, setStartCameraErrorMsg] = useState('');

  let videoRef = useRef(null);

  // component will mount
  // TODO check ...
  useEffect (()=>{
    restartCamera(props.idealFacingMode, props.idealResolution, props.isMaxResolution);
  }, [props.idealFacingMode, props.idealResolution, props.isMaxResolution]);

  // Component has mount
  useEffect (()=>{
    libCameraPhoto = new LibCameraPhoto(videoRef.current);
    if (props.isMaxResolution) {
      startCameraMaxResolution(props.idealFacingMode);
    } else {
      startCameraIdealResolution(props.idealFacingMode, props.idealResolution);
    }

    // componentWillUnmount
    return () => {
      clearShowVideoTimeout();
      const isComponentWillUnmount = true;
      stopCamera(isComponentWillUnmount)
        .catch((error) => {
          printCameraInfo(error.message);
        });
    }
  }, []);

  function clearShowVideoTimeout () {
    if (showVideoTimeoutId) {
      clearTimeout(showVideoTimeoutId);
    }
  }

  function restartCamera (idealFacingMode, idealResolution, isMaxResolution) {
    stopCamera()
      .then()
      .catch((error) => {
        printCameraInfo(error.message);
      })
      .then(() => {
        if (isMaxResolution) {
          startCameraMaxResolution(idealFacingMode);
        } else {
          startCameraIdealResolution(idealFacingMode, idealResolution);
        }
      });
  }

  function startCamera (promiseStartCamera) {
    promiseStartCamera
      .then((stream) => {
        setIsCameraStarted(true);
        setStartCameraErrorMsg('');
        if (typeof props.onCameraStart === 'function') {
          props.onCameraStart(stream);
        }
      })
      .catch((error) => {
        setStartCameraErrorMsg(`${error.name} ${error.message}`);
        if (typeof props.onCameraError === 'function') {
          props.onCameraError(error);
        }
      });
  }

  function startCameraIdealResolution (idealFacingMode, idealResolution) {
    let promiseStartCamera =
        libCameraPhoto.startCamera(idealFacingMode, idealResolution);
    startCamera(promiseStartCamera);
  }

  function startCameraMaxResolution (idealFacingMode) {
    let promiseStartCamera =
        libCameraPhoto.startCameraMaxResolution(idealFacingMode);
    startCamera(promiseStartCamera);
  }

  function stopCamera (isComponentWillUnmount = false) {
    return new Promise((resolve, reject) => {
      libCameraPhoto.stopCamera()
        .then(() => {
          if (!isComponentWillUnmount) {
            setIsCameraStarted(false);
          }
          if (typeof props.onCameraStop === 'function') {
            props.onCameraStop();
          }
          resolve();
        })
        .catch((error) => {
          if (typeof props.onCameraError === 'function') {
            props.onCameraError(error);
          }
          reject(error);
        });
    });
  }

  function handleTakePhoto () {

    const configDataUri = {
      sizeFactor: props.sizeFactor,
      imageType: props.imageType,
      imageCompression: props.imageCompression,
      isImageMirror: props.isImageMirror
    };

    let dataUri = libCameraPhoto.getDataUri(configDataUri);

    if (!props.isSilentMode) {
      playClickAudio();
    }

    if (typeof props.onTakePhoto === 'function') {
      props.onTakePhoto(dataUri);
    }

    setDataUri(dataUri);
    setIsShowVideo(false);

    clearShowVideoTimeout();
    showVideoTimeoutId = setTimeout(() => {
      setIsShowVideo(true);

      if (typeof props.onTakePhotoAnimationDone === 'function') {
        onTakePhotoAnimationDone(dataUri);
      }
    }, 900);
  }

  let videoStyles = getVideoStyles(isShowVideo, props.isImageMirror);
  let showHideImgStyle = getShowHideStyle(!isShowVideo);

  let classNameFullscreen = props.isFullscreen ? 'react-html5-camera-photo-fullscreen' : '';
  return (
    <div className={'react-html5-camera-photo ' + classNameFullscreen}>
      <DisplayError
        cssClass={'display-error'}
        isDisplayError={props.isDisplayStartCameraError}
        errorMsg={startCameraErrorMsg}
      />
      <WhiteFlash
        isShowWhiteFlash={!isShowVideo}
      />
      <img
        style={showHideImgStyle}
        alt="camera"
        src={dataUri}
      />
      <video
        style={videoStyles}
        ref={videoRef}
        autoPlay={true}
        muted="muted"
        playsInline
      />
      <CircleButton
        isClicked={!isShowVideo}
        onClick={handleTakePhoto}
      />
    </div>
  );
}

export {
  Camera,
  FACING_MODES,
  IMAGE_TYPES
};

export default Camera;

Camera.propTypes = {
  onTakePhoto: PropTypes.func,
  onTakePhotoAnimationDone: PropTypes.func,
  onCameraError: PropTypes.func,
  idealFacingMode: PropTypes.string,
  idealResolution: PropTypes.object,
  imageType: PropTypes.string,
  isImageMirror: PropTypes.bool,
  isSilentMode: PropTypes.bool,
  isDisplayStartCameraError: PropTypes.bool,
  imageCompression: PropTypes.number,
  isMaxResolution: PropTypes.bool,
  isFullscreen: PropTypes.bool,
  sizeFactor: PropTypes.number,
  onCameraStart: PropTypes.func,
  onCameraStop: PropTypes.func
};

Camera.defaultProps = {
  isImageMirror: true,
  isDisplayStartCameraError: true
};
