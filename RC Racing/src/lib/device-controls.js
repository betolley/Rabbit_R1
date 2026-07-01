export const inputState = { up: false, down: false, left: false, right: false, gas: false, brake: false };
export const initControls = () => {
  window.addEventListener('keydown', (e) => {
    switch(e.key) {
      case 'ArrowUp': inputState.up = true; break;
      case 'ArrowDown': inputState.down = true; break;
      case 'ArrowLeft': inputState.left = true; break;
      case 'ArrowRight': inputState.right = true; break;
      case 'Enter': case 'a': case 'A': inputState.gas = true; break;
      case 'Escape': case 'b': case 'B': inputState.brake = true; break;
    }
  });
  window.addEventListener('keyup', (e) => {
    switch(e.key) {
      case 'ArrowUp': inputState.up = false; break;
      case 'ArrowDown': inputState.down = false; break;
      case 'ArrowLeft': inputState.left = false; break;
      case 'ArrowRight': inputState.right = false; break;
      case 'Enter': case 'a': case 'A': inputState.gas = false; break;
      case 'Escape': case 'b': case 'B': inputState.brake = false; break;
    }
  });
};