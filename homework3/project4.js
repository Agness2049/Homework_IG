// This function takes the projection matrix, the translation, and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// The given projection matrix is also a 4x4 matrix stored as an array in column-major order.
// You can use the MatrixMult function defined in project4.html to multiply two 4x4 matrices in the same format.
function GetModelViewProjection( projectionMatrix, translationX, translationY, translationZ, rotationX, rotationY )
{
	R11 = Math.cos(rotationY);
	R12 = 0;
	R13 = Math.sin(rotationY);

	R21 = Math.sin(rotationX) * Math.sin(rotationY);
	R22 = Math.cos(rotationX);
	R23 = -Math.sin(rotationX) * Math.cos(rotationY);

	R31 = -Math.cos(rotationX) * Math.sin(rotationY);
	R32 = Math.sin(rotationX);
	R33 = Math.cos(rotationX) * Math.cos(rotationY);

	// [TO-DO] Modify the code below to form the transformation matrix.
	var trans = [
		R11, R21, R31, 0,
		R12, R22, R32, 0,
		R13, R23, R33, 0,
		translationX, translationY, translationZ, 1
	];
	var mvp = MatrixMult( projectionMatrix, trans );
	return mvp;
}





// [TO-DO] Complete the implementation of the following class.


		// Vertex shader source code
		var VS = `
		attribute vec3 vertPosition;
		uniform mat4 mvp;
		attribute vec2 vertTexCoord;
		varying vec2 fragTexCoord;

		// Uniform per controllare l'inversione degli assi Y e Z
		uniform bool swapYZ;

		void main()
		{
			vec3 pos = vertPosition;
		if (swapYZ) {
			// Inverti gli assi Y e Z
			pos.yz = pos.zy;
			
		}

		gl_Position = mvp * vec4(pos, 1);
		fragTexCoord = vertTexCoord;

		}
		`;
		// Fragment shader source code
		var FS = `
		precision mediump float;
		varying vec2 fragTexCoord;
		uniform sampler2D sampler;
		uniform bool textureOn;
		void main()
		{
			if(textureOn) gl_FragColor = texture2D(sampler, fragTexCoord);
			else gl_FragColor = vec4(1,gl_FragCoord.z*gl_FragCoord.z,0,1);
		}
		`;


class MeshDrawer
{
	// The constructor is a good place for taking care of the necessary initializations.
	constructor()
	{


		// [TO-DO] initializations
		
		this.numTriangles = null;

		this.prog = InitShaderProgram(VS, FS);
		
		this.vertexBuffer = gl.createBuffer(); //is a chunk of memory on the gpu

		// Get the ids of the uniform variables in the shaders
		this.mvp = gl.getUniformLocation( this.prog, 'mvp' );

		
		this.elementBuffer = gl.createBuffer();

		// Get the ids of the vertex attributes in the shaders
		//this.vertPos = gl.getAttribLocation( this.prog, 'pos' );

		this.texCoordAttribLocation = gl.getAttribLocation(this.prog, 'vertTexCoord');
		this.positionAttribLocation = gl.getAttribLocation(this.prog, 'vertPosition');

		
		this.texture = gl.createTexture();
		this.texture_on  = false;

		this.sampler = gl.getUniformLocation(this.prog, 'sampler');


		
	}
	
	// This method is called every time the user opens an OBJ file.
	// The arguments of this function is an array of 3D vertex positions
	// and an array of 2D texture coordinates.
	// Every item in these arrays is a floating point value, representing one
	// coordinate of the vertex position or texture coordinate.
	// Every three consecutive elements in the vertPos array forms one vertex
	// position and every three consecutive vertex positions form a triangle.
	// Similarly, every two consecutive elements in the texCoords array
	// form the texture coordinate of a vertex.
	// Note that this method can be called multiple times.
	setMesh( vertPos, texCoords )
	{
		// [TO-DO] Update the contents of the vertex buffer objects.
		this.numTriangles = vertPos.length / 3;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.elementBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
    }
	
	// This method is called when the user changes the state of the
	// "Swap Y-Z Axes" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	swapYZ( swap )
	{
		// [TO-DO] Set the uniform parameter(s) of the vertex shader

    const swapUniform = gl.getUniformLocation(this.prog, 'swapYZ');
	
    // Assegna il valore al parametro uniform nel vertex shader
    gl.useProgram(this.prog);
    gl.uniform1i(swapUniform, swap);
		
	}
	
	// This method is called to draw the triangular mesh.
	// The argument is the transformation matrix, the same matrix returned
	// by the GetModelViewProjection function above.
	draw( trans )
	{
		// [TO-DO] Complete the WebGL initializations before drawing

		gl.useProgram( this.prog );
		
		gl.uniformMatrix4fv( this.mvp, false, trans );

		//gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexBuffer );
		//gl.vertexAttribPointer( this.vertPos, 3, gl.FLOAT, false, 0, 0 ); //specify the layout of the attribute
		//gl.enableVertexAttribArray(this.vertPos);


		gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexBuffer );
		gl.vertexAttribPointer( this.positionAttribLocation, 3, gl.FLOAT, false, 0, 0 ); //specify the layout of the attribute
		gl.enableVertexAttribArray(this.positionAttribLocation);

		gl.bindBuffer( gl.ARRAY_BUFFER, this.elementBuffer );
		gl.vertexAttribPointer( this.texCoordAttribLocation, 2, gl.FLOAT, false, 0, 0 ); //specify the layout of the attribute
		gl.enableVertexAttribArray(this.texCoordAttribLocation);
        

		if (this.texture_on) {
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            gl.activeTexture(gl.TEXTURE0);
            gl.uniform1i(this.sampler, 0);
        }
		
		gl.uniform1i(gl.getUniformLocation(this.prog, 'textureOn'), this.texture_on ? 1 : 0);

		gl.drawArrays( gl.TRIANGLES, 0, this.numTriangles );
		
	}
	
	// This method is called to set the texture of the mesh.
	// The argument is an HTML IMG element containing the texture data.
	setTexture( img )
	{
		
		// [TO-DO] Bind the texture
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
  

		// You can set the texture image data using the following command.
		gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img );
		gl.generateMipmap(gl.TEXTURE_2D);

		
	gl.bindTexture(gl.TEXTURE_2D, null);
		
		// [TO-DO] Now that we have a texture, it might be a good idea to set
		// some uniform parameter(s) of the fragment shader, so that it uses the texture.
	}
	
	// This method is called when the user changes the state of the
	// "Show Texture" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	showTexture( show )
	{
		// [TO-DO] set the uniform parameter(s) of the fragment shader to specify if it should use the texture.
		this.texture_on = show;
	}
	


	InitShaderProgram( vsSource, fsSource )
	{
		const vs = CompileShader( gl.VERTEX_SHADER,   vsSource );
		const fs = CompileShader( gl.FRAGMENT_SHADER, fsSource );

		const prog = gl.createProgram();
		gl.attachShader(prog, vs);
		gl.attachShader(prog, fs);
		gl.linkProgram(prog);

		if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
			alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(prog));
			return null;
		}
		return prog;
	}

// This is a helper function for compiling a shader, called by InitShaderProgram().
 CompileShader( type, source )
{
	const shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter( shader, gl.COMPILE_STATUS) ) {
		alert('An error occurred compiling shader:\n' + gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}

}
