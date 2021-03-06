'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const {Image} = require('gemini-core');

const CoordValidator = require('lib/capture-session/coord-validator');
const Viewport = require('lib/capture-session/viewport');

describe('Viewport', () => {
    const sandbox = sinon.sandbox.create();

    const createViewport = (opts) => new Viewport(opts.coords || {top: 0, left: 0}, opts.image, opts.pixelRatio);

    afterEach(() => sandbox.restore());

    describe('validate', () => {
        const validate = (opts) => {
            opts = _.defaults(opts || {}, {
                viewport: {},
                captureArea: {},
                browser: 'default-bro'
            });

            const viewport = createViewport(opts.viewport);

            viewport.validate(opts.captureArea, opts.browser);
        };

        beforeEach(() => {
            sandbox.spy(CoordValidator, 'create');
            sandbox.stub(CoordValidator.prototype, 'validate');
        });

        it('should create coordinates validator with passed browser', () => {
            validate({browser: 'some-browser'});

            assert.calledWith(CoordValidator.create, 'some-browser');
        });

        it('should validate passed capture area', () => {
            validate({
                viewport: {coords: {top: 0, left: 0}},
                captureArea: {top: 1, left: 1}
            });

            assert.calledWith(CoordValidator.prototype.validate, {top: 0, left: 0}, {top: 1, left: 1});
        });
    });

    describe('ignoreAreas', () => {
        let image;

        beforeEach(() => image = sinon.createStubInstance(Image));

        it('should ignore passed areas', () => {
            const viewport = createViewport({image, pixelRatio: 1});

            viewport.ignoreAreas([{top: 1, left: 1}]);

            assert.calledWith(image.clear, {top: 1, left: 1}, {scaleFactor: 1});
        });

        it('should transform area coordinates to a viewport origin', () => {
            const viewport = createViewport({coords: {top: 1, left: 1}, image});

            viewport.ignoreAreas([{top: 1, left: 1}]);

            assert.calledWith(image.clear, {top: 0, left: 0});
        });
    });

    describe('crop', () => {
        let image;

        beforeEach(() => {
            image = sinon.createStubInstance(Image);

            image.crop.returns(Promise.resolve());
        });

        it('should crop an image', () => {
            const viewport = createViewport({image, pixelRatio: 1});

            return viewport.crop({top: 1, left: 1})
                .then(() => assert.calledWith(image.crop, {top: 1, left: 1}, {scaleFactor: 1}));
        });

        it('should transform area coordinates to a viewport origin', () => {
            const viewport = createViewport({image, coords: {top: 1, left: 1}});

            return viewport.crop({top: 1, left: 1})
                .then(() => assert.calledWith(image.crop, {top: 0, left: 0}));
        });
    });

    describe('save', () => {
        let image;

        beforeEach(() => image = sinon.createStubInstance(Image));

        it('should save viewport image', () => {
            const viewport = createViewport({image});

            viewport.save('path/to/img');

            assert.calledWith(image.save, 'path/to/img');
        });
    });

    describe('extendBy', () => {
        let image;
        let newImage;

        beforeEach(() => {
            image = sinon.createStubInstance(Image);
            newImage = sinon.createStubInstance(Image);

            newImage.crop.returns(Promise.resolve());
            newImage.getSize.returns({});
        });

        it('should increase viewport height value by scroll height', () => {
            const viewport = createViewport({coords: {height: 5}, image});

            return viewport.extendBy(2, newImage)
                .then(() => assert.equal(viewport.getVerticalOverflow({height: 7}), 0));
        });

        it('should crop new image by passed scroll height', () => {
            const viewport = createViewport({image, pixelRatio: 0.5});

            newImage.getSize.returns({height: 4, width: 2});

            return viewport.extendBy(2, newImage)
                .then(() => assert.calledWith(newImage.crop, {left: 0, top: 3, width: 2, height: 1}));
        });

        it('should join original image with cropped image', () => {
            const viewport = createViewport({image});

            newImage.crop.returns(Promise.resolve('cropped-image'));

            return viewport.extendBy(null, newImage)
                .then(() => assert.calledWith(image.join, 'cropped-image'));
        });
    });

    describe('getVerticalOverflow', () => {
        it('should get outside height', () => {
            const viewport = createViewport({coords: {height: 5}});

            assert.equal(viewport.getVerticalOverflow({height: 15}), 10);
        });
    });
});
