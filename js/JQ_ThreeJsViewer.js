/**
 * 三维模型查看器
 * @param {string} selecter 容器元素id
 * @param {string} isAnimation 是否自动旋转
 */
var JQ_ThreeJsViewer = function (selecter, isAnimation) {
	this.keyboard = new THREEx.KeyboardState()

	this.scene = new THREE.Scene()
	this.scene.background = new THREE.Color(0xeeeeee)

	this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200000)
	this.camera.position.set(250, 250, 250)
	this.camera.lookAt(0, 0, 0)
	this.scene.add(this.camera)

	this.renderer = Detector.webgl ? new THREE.WebGLRenderer({ antialias: true }) : new THREE.CanvasRenderer()
	this.renderer.setSize(window.innerWidth, window.innerHeight)

	this.container = document.getElementById(selecter)
	this.container.appendChild(this.renderer.domElement)

	this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement)

	THREEx.WindowResize(this.renderer, this.camera)
	THREEx.FullScreen.bindKey({ charCode: 'm'.charCodeAt(0) })

	//环境光
	this.ambient = new THREE.AmbientLight(0xffffff)
	this.ambient.intensity = 3
	this.scene.add(this.ambient)

	//已经加装的model
	this.Models = []

	this.IsAnimation = isAnimation || false

	JQ_ThreeJsViewer.prototype.Bind = function (object, func) {
		return function () {
			return func.apply(object, arguments)
		}
	}

	/**
	 * 初始化6个方向的光照
	 * @param {string} intensity 光照强度
	 * @param {string} height 光源高度
	 */
	JQ_ThreeJsViewer.prototype.initLight = function (intensity, height) {
		intensity = intensity || 2
		height = height || 1000

		var lightConfigs = [
			[height, 0, 0],
			[-height, 0, 0],
			[0, height, 0],
			[0, -height, 0],
			[0, 0, height],
			[0, 0, -height],
		]

		for (var i = 0; i < lightConfigs.length; i++) {
			var _light = lightConfigs[i]

			var light = new THREE.PointLight(0xffffff)
			light.intensity = intensity
			light.position.set(_light[0], _light[1], _light[2])
			this.scene.add(light)
		}
	}

	/**
	 * 加载zip格式模型
	 * @param {string} zipUrls 压缩包访问地址数组
	 * @param {string} suffixArr 指定解析的模型后缀名,默认'.glb', '.obj', '.gltf'
	 */
	JQ_ThreeJsViewer.prototype.LoadZips = function (zipUrls, suffixArr) {
		var that = this
		if (!zipUrls || zipUrls.length <= 0) return
		suffixArr = suffixArr || ['.glb', '.obj', '.gltf']

		var promiseArr = []
		var _group = new THREE.Group()
		that.scene.add(_group)
		var group = new THREE.Group()
		that.scene.add(group)
		for (var i = 0; i < zipUrls.length; i++) {
			var zipUrl = zipUrls[i]

			var promise = new Promise((resolve, reject) => {
				//异步方法
				THREE.ZipLoadingManager.uncompress(zipUrl, suffixArr).then(function (zip) {
					for (var j = 0; j < zip.urls.length; j++) {
						new THREE.GLTFLoader(zip.manager).load(zip.urls[j], function (obj) {
							group.add(obj.scene)
							//that.scene.add(obj.scene);
							resolve()
						})
					}
				})
			})
			promiseArr.push(promise)
		}

		Promise.all(promiseArr).then((res) => {
			//重新计算中心点
			var bbox = new THREE.Box3().setFromObject(group)
			var mdlen = bbox.max.x - bbox.min.x
			var mdwid = bbox.max.z - bbox.min.z
			var mdhei = bbox.max.y - bbox.min.y
			var x1 = bbox.min.x + mdlen / 2
			var y1 = bbox.min.y + mdhei / 2
			var z1 = bbox.min.z + mdwid / 2

			if (TWEEN) {
				new TWEEN.Tween(group.position).to({ x: -x1, y: -y1, z: -z1 }, 1000).start()
			} else {
				group.position.set(-x1, -y1, -z1)
			}

			if (TWEEN) {
				new TWEEN.Tween(this.camera.position)
					.to({ x: mdlen * 1.1, y: mdhei * 1.1, z: mdwid * 1.1 }, 1000)
					.start()
			} else {
				this.camera.position.set(mdlen * 1.1, mdhei * 1.1, mdwid * 1.1)
			}

			_group.add(group)
			_group.position.set(0, 0, 0)
			this.Models.push(_group)
		})
	}

	JQ_ThreeJsViewer.prototype.update = function () {
		var that = this
		if (TWEEN) TWEEN.update()

		if (this.IsAnimation) {
			for (var i = 0; i < this.Models.length; i++) {
				var _model = this.Models[i]
				_model.rotation.y += 0.005
			}
		}
		this.controls.update()
		this.renderer.clear()
		this.renderer.render(this.scene, this.camera)
		requestAnimationFrame(that.Bind(that, that.update))
	}
	this.update()
}
