import * as tf from "npm:@tensorflow/tfjs@4.22.0";



const v1 = tf.tensor3d([1, 2, 3], [1, 3, 1]) 
const v2 = tf.tensor3d([4, 5], [2, 1, 1])

const output = tf.conv1d(v1, v2, 1, 'valid');
output.print();

